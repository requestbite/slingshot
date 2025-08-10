/**
 * @fileoverview Client-side API for managing RequestBite Slingshot data
 * Provides CRUD operations for environments, collections, folders, requests, and secrets
 * All data is stored locally in IndexedDB via Dexie
 */

import db from '../db/schema.js';
import { generateUUID } from '../utils/uuid.js';
import { validateRequest, validateEnvironment, validateCollection, validateFolder } from '../utils/validation.js';
import { encryptSecret, decryptSecret, hasSessionKey } from '../utils/encryption.js';

/**
 * Client-side API for managing RequestBite Slingshot data
 * Provides complete CRUD operations for all entity types with validation
 */
export class SlingshotApiClient {
  
  // Environment operations
  
  /**
   * Creates a new environment
   * @param {Object} environmentData - The environment data
   * @param {string} environmentData.name - Environment name (required)
   * @param {string} [environmentData.description] - Environment description
   * @returns {Promise<import('../types/index.js').Environment>} The created environment
   * @throws {Error} If validation fails
   */
  async createEnvironment(environmentData) {
    const validation = validateEnvironment(environmentData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const environment = {
      id: generateUUID(),
      name: environmentData.name,
      description: environmentData.description || '',
      secrets: []
    };

    const id = await db.environments.add(environment);
    return await db.environments.get(id);
  }

  /**
   * Retrieves an environment by ID
   * @param {string} id - Environment ID
   * @returns {Promise<import('../types/index.js').Environment|undefined>} The environment or undefined if not found
   */
  async getEnvironment(id) {
    return await db.environments.get(id);
  }

  /**
   * Retrieves all environments ordered by name
   * @returns {Promise<import('../types/index.js').Environment[]>} Array of all environments
   */
  async getAllEnvironments() {
    return await db.environments.orderBy('name').toArray();
  }

  /**
   * Updates an existing environment
   * @param {string} id - Environment ID
   * @param {Partial<import('../types/index.js').Environment>} updates - Fields to update
   * @returns {Promise<import('../types/index.js').Environment>} The updated environment
   * @throws {Error} If environment not found
   */
  async updateEnvironment(id, updates) {
    const existing = await db.environments.get(id);
    if (!existing) {
      throw new Error('Environment not found');
    }

    const updatedData = {
      ...updates
    };

    await db.environments.update(id, updatedData);
    return await db.environments.get(id);
  }

  /**
   * Deletes an environment and all related data
   * @param {string} id - Environment ID
   * @returns {Promise<void>}
   */
  async deleteEnvironment(id) {
    // Delete related variables first
    await db.variables.where('environment_id').equals(id).delete();
    return await db.environments.delete(id);
  }

  // Collection operations
  
  /**
   * Creates a new collection
   * @param {Object} collectionData - The collection data
   * @param {string} collectionData.name - Collection name (required)
   * @param {string} [collectionData.description] - Collection description
   * @param {string} [collectionData.environment_id] - Associated environment ID
   * @returns {Promise<import('../types/index.js').Collection>} The created collection
   * @throws {Error} If validation fails
   */
  async createCollection(collectionData) {
    const validation = validateCollection(collectionData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const collection = {
      id: generateUUID(),
      environment_id: collectionData.environment_id || null,
      name: collectionData.name,
      description: collectionData.description || '',
      variables: collectionData.variables || []
    };

    const id = await db.collections.add(collection);
    return await db.collections.get(id);
  }

  /**
   * Retrieves a collection by ID
   * @param {string} id - Collection ID
   * @returns {Promise<import('../types/index.js').Collection|undefined>} The collection or undefined if not found
   */
  async getCollection(id) {
    return await db.collections.get(id);
  }

  /**
   * Retrieves all collections ordered by name
   * @returns {Promise<import('../types/index.js').Collection[]>} Array of all collections
   */
  async getAllCollections() {
    return await db.collections.orderBy('name').toArray();
  }

  /**
   * Retrieves all collections for a specific environment
   * @param {string} environmentId - Environment ID
   * @returns {Promise<import('../types/index.js').Collection[]>} Array of collections in the environment
   */
  async getCollectionsByEnvironment(environmentId) {
    return await db.collections.where('environment_id').equals(environmentId).toArray();
  }

  /**
   * Updates an existing collection
   * @param {string} id - Collection ID
   * @param {Partial<import('../types/index.js').Collection>} updates - Fields to update
   * @returns {Promise<import('../types/index.js').Collection>} The updated collection
   * @throws {Error} If collection not found
   */
  async updateCollection(id, updates) {
    const existing = await db.collections.get(id);
    if (!existing) {
      throw new Error('Collection not found');
    }

    const updatedData = {
      ...updates
    };

    await db.collections.update(id, updatedData);
    return await db.collections.get(id);
  }

  /**
   * Deletes a collection and all related folders, requests, and secrets
   * @param {string} id - Collection ID
   * @returns {Promise<void>}
   */
  async deleteCollection(id) {
    // Delete related folders, requests, and secrets
    const folders = await db.folders.where('collection_id').equals(id).toArray();
    for (const folder of folders) {
      await this.deleteFolder(folder.id);
    }
    
    await db.requests.where('collection_id').equals(id).delete();
    await db.variables.where('collection_id').equals(id).delete();
    
    return await db.collections.delete(id);
  }

  // Folder operations
  
  /**
   * Creates a new folder
   * @param {Object} folderData - The folder data
   * @param {string} folderData.name - Folder name (required)
   * @param {string} folderData.collection_id - Collection ID (required)
   * @param {string} [folderData.parent_folder_id] - Parent folder ID for nested folders
   * @returns {Promise<import('../types/index.js').Folder>} The created folder
   * @throws {Error} If validation fails
   */
  async createFolder(folderData) {
    const validation = validateFolder(folderData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const folder = {
      id: generateUUID(),
      collection_id: folderData.collection_id,
      parent_folder_id: folderData.parent_folder_id || null,
      name: folderData.name
    };

    const id = await db.folders.add(folder);
    return await db.folders.get(id);
  }

  /**
   * Retrieves a folder by ID
   * @param {string} id - Folder ID
   * @returns {Promise<import('../types/index.js').Folder|undefined>} The folder or undefined if not found
   */
  async getFolder(id) {
    return await db.folders.get(id);
  }

  /**
   * Retrieves all folders in a collection
   * @param {string} collectionId - Collection ID
   * @returns {Promise<import('../types/index.js').Folder[]>} Array of folders in the collection
   */
  async getFoldersByCollection(collectionId) {
    return await db.folders.where('collection_id').equals(collectionId).toArray();
  }

  /**
   * Retrieves all child folders of a parent folder
   * @param {string} parentFolderId - Parent folder ID
   * @returns {Promise<import('../types/index.js').Folder[]>} Array of child folders
   */
  async getFoldersByParent(parentFolderId) {
    return await db.folders.where('parent_folder_id').equals(parentFolderId).toArray();
  }

  /**
   * Retrieves all root-level folders in a collection (folders with no parent)
   * @param {string} collectionId - Collection ID
   * @returns {Promise<import('../types/index.js').Folder[]>} Array of root folders
   */
  async getRootFolders(collectionId) {
    return await db.folders.where(['collection_id', 'parent_folder_id']).equals([collectionId, null]).toArray();
  }

  /**
   * Updates an existing folder
   * @param {string} id - Folder ID
   * @param {Partial<import('../types/index.js').Folder>} updates - Fields to update
   * @returns {Promise<import('../types/index.js').Folder>} The updated folder
   * @throws {Error} If folder not found
   */
  async updateFolder(id, updates) {
    const existing = await db.folders.get(id);
    if (!existing) {
      throw new Error('Folder not found');
    }

    const updatedData = {
      ...updates
    };

    await db.folders.update(id, updatedData);
    return await db.folders.get(id);
  }

  /**
   * Deletes a folder and all its child folders and requests recursively
   * @param {string} id - Folder ID
   * @returns {Promise<void>}
   */
  async deleteFolder(id) {
    // Delete child folders recursively
    const childFolders = await db.folders.where('parent_folder_id').equals(id).toArray();
    for (const childFolder of childFolders) {
      await this.deleteFolder(childFolder.id);
    }
    
    // Delete requests in this folder
    await db.requests.where('folder_id').equals(id).delete();
    
    return await db.folders.delete(id);
  }

  // Request operations
  
  /**
   * Creates a new HTTP request
   * @param {Object} requestData - The request data
   * @param {string} requestData.name - Request name (required)
   * @param {string} requestData.collection_id - Collection ID (required)
   * @param {string} [requestData.url] - Request URL
   * @param {string} [requestData.method='GET'] - HTTP method
   * @param {string} [requestData.folder_id] - Folder ID
   * @param {import('../types/index.js').KeyValuePair[]} [requestData.headers] - Request headers
   * @param {import('../types/index.js').KeyValuePair[]} [requestData.params] - Query parameters
   * @param {import('../types/index.js').KeyValuePair[]} [requestData.path_params] - Path parameters
   * @param {string} [requestData.request_type='none'] - Request body type
   * @param {string} [requestData.content_type] - Content type
   * @param {string} [requestData.body] - Request body
   * @param {import('../types/index.js').FormDataItem[]} [requestData.form_data] - Form data
   * @returns {Promise<import('../types/index.js').Request>} The created request
   * @throws {Error} If validation fails
   */
  async createRequest(requestData) {
    const validation = validateRequest(requestData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const request = {
      id: generateUUID(),
      collection_id: requestData.collection_id,
      folder_id: requestData.folder_id || null,
      name: requestData.name,
      method: requestData.method || 'GET',
      url: requestData.url || '',
      headers: requestData.headers || [],
      params: requestData.params || [],
      path_params: requestData.path_params || [],
      request_type: requestData.request_type || 'none',
      content_type: requestData.content_type || '',
      body: requestData.body || '',
      form_data: requestData.form_data || [],
      url_encoded_data: requestData.url_encoded_data || [],
      response_data: null,
      response_type: null,
      response_headers: null,
      response_status: null,
      response_time: null,
      response_size: null,
      response_received_at: null,
      // Initialize draft fields
      has_draft_edits: false,
      draft_method: null,
      draft_url: null,
      draft_headers: null,
      draft_params: null,
      draft_path_params: null,
      draft_request_type: null,
      draft_content_type: null,
      draft_body: null,
      draft_form_data: null,
      draft_url_encoded_data: null
    };

    const id = await db.requests.add(request);
    return await db.requests.get(id);
  }

  /**
   * Retrieves a request by ID
   * @param {string} id - Request ID
   * @returns {Promise<import('../types/index.js').Request|undefined>} The request or undefined if not found
   */
  async getRequest(id) {
    return await db.requests.get(id);
  }

  /**
   * Retrieves all requests in a collection
   * @param {string} collectionId - Collection ID
   * @returns {Promise<import('../types/index.js').Request[]>} Array of requests in the collection
   */
  async getRequestsByCollection(collectionId) {
    return await db.requests.where('collection_id').equals(collectionId).toArray();
  }

  /**
   * Retrieves all requests in a folder
   * @param {string} folderId - Folder ID
   * @returns {Promise<import('../types/index.js').Request[]>} Array of requests in the folder
   */
  async getRequestsByFolder(folderId) {
    return await db.requests.where('folder_id').equals(folderId).toArray();
  }

  /**
   * Updates an existing request
   * @param {string} id - Request ID
   * @param {Partial<import('../types/index.js').Request>} updates - Fields to update
   * @returns {Promise<import('../types/index.js').Request>} The updated request
   * @throws {Error} If request not found
   */
  async updateRequest(id, updates) {
    const existing = await db.requests.get(id);
    if (!existing) {
      throw new Error('Request not found');
    }

    const updatedData = {
      ...updates
    };

    await db.requests.update(id, updatedData);
    return await db.requests.get(id);
  }

  /**
   * Updates the response data for a request (after executing the request)
   * @param {string} id - Request ID
   * @param {import('../types/index.js').ResponseData} responseData - Response data from request execution
   * @returns {Promise<import('../types/index.js').Request>} The updated request
   * @throws {Error} If request not found
   */
  async updateRequestResponse(id, responseData) {
    const existing = await db.requests.get(id);
    if (!existing) {
      throw new Error('Request not found');
    }

    const updatedData = {
      response_data: responseData.data,
      response_type: responseData.type,
      response_headers: responseData.headers,
      response_status: responseData.status,
      response_time: responseData.time,
      response_size: responseData.size,
      response_received_at: new Date()
    };

    await db.requests.update(id, updatedData);
    return await db.requests.get(id);
  }

  /**
   * Saves response data for a request
   * @param {string} id - Request ID
   * @param {Object} responseData - Response data from requestSubmitter
   * @returns {Promise<import('../types/index.js').Request>} Updated request
   */
  async saveRequestResponse(id, responseData) {
    const request = await db.requests.get(id);
    if (!request) {
      throw new Error('Request not found');
    }

    const updatedData = {
      // Response data fields
      response_data: responseData.responseData || null,
      response_headers: responseData.rawHeaders || {},
      response_status: responseData.status || null,
      response_status_text: responseData.statusText || null,
      response_time: responseData.responseTime || null,
      response_size: responseData.responseSize || null,
      response_raw_time: responseData.rawResponseTime || null,
      response_raw_size: responseData.rawResponseSize || null,
      response_is_binary: responseData.isBinary || false,
      response_binary_data: responseData.binaryData || null,
      response_cancelled: responseData.cancelled || false,
      response_success: responseData.success || false,
      response_error_type: responseData.errorType || null,
      response_error_title: responseData.errorTitle || null,
      response_error_message: responseData.errorMessage || null,
      response_received_at: new Date(responseData.receivedAt || new Date())
    };

    await db.requests.update(id, updatedData);
    return await db.requests.get(id);
  }

  /**
   * Duplicates an existing request
   * @param {string} id - Request ID to duplicate
   * @returns {Promise<import('../types/index.js').Request>} The duplicated request
   * @throws {Error} If request not found
   */
  async duplicateRequest(id) {
    const original = await db.requests.get(id);
    if (!original) {
      throw new Error('Request not found');
    }

    // Create duplicate with same configuration but no response data
    const duplicateData = {
      collection_id: original.collection_id,
      folder_id: original.folder_id,
      name: original.name + " (copy)",
      method: original.method,
      url: original.url,
      headers: original.headers || [],
      params: original.params || [],
      path_params: original.path_params || [],
      request_type: original.request_type || 'none',
      content_type: original.content_type || 'json',
      body: original.body || '',
      form_data: original.form_data || [],
      url_encoded_data: original.url_encoded_data || []
      // Note: Response fields are intentionally not copied
    };

    return await this.createRequest(duplicateData);
  }

  /**
   * Deletes a request
   * @param {string} id - Request ID
   * @returns {Promise<void>}
   */
  async deleteRequest(id) {
    return await db.requests.delete(id);
  }

  /**
   * Saves draft changes to a request without updating the main fields
   * @param {string} id - Request ID
   * @param {Object} draftData - Draft data to save
   * @returns {Promise<import('../types/index.js').Request>} Updated request
   */
  async saveDraftChanges(id, draftData) {
    const existing = await db.requests.get(id);
    if (!existing) {
      throw new Error('Request not found');
    }

    const draftUpdates = {
      has_draft_edits: true,
      draft_method: draftData.method,
      draft_url: draftData.url,
      draft_headers: draftData.headers || [],
      draft_params: draftData.queryParams || [],
      draft_path_params: draftData.pathParams || [],
      draft_request_type: draftData.bodyType,
      draft_content_type: draftData.contentType,
      draft_body: draftData.bodyContent,
      draft_form_data: draftData.formData || [],
      draft_url_encoded_data: draftData.urlEncodedData || []
    };

    await db.requests.update(id, draftUpdates);
    return await db.requests.get(id);
  }

  /**
   * Applies draft changes to the main request fields and clears draft data
   * @param {string} id - Request ID
   * @returns {Promise<import('../types/index.js').Request>} Updated request
   */
  async applyDraftChanges(id) {
    const existing = await db.requests.get(id);
    if (!existing || !existing.has_draft_edits) {
      throw new Error('Request not found or has no draft changes');
    }

    const updates = {
      method: existing.draft_method || existing.method,
      url: existing.draft_url || existing.url,
      headers: existing.draft_headers || existing.headers,
      params: existing.draft_params || existing.params,
      path_params: existing.draft_path_params || existing.path_params,
      request_type: existing.draft_request_type || existing.request_type,
      content_type: existing.draft_content_type || existing.content_type,
      body: existing.draft_body || existing.body,
      form_data: existing.draft_form_data || existing.form_data,
      url_encoded_data: existing.draft_url_encoded_data || existing.url_encoded_data,
      // Clear draft fields
      has_draft_edits: false,
      draft_method: null,
      draft_url: null,
      draft_headers: null,
      draft_params: null,
      draft_path_params: null,
      draft_request_type: null,
      draft_content_type: null,
      draft_body: null,
      draft_form_data: null,
      draft_url_encoded_data: null
    };

    await db.requests.update(id, updates);
    return await db.requests.get(id);
  }

  /**
   * Discards draft changes and restores the original request data
   * @param {string} id - Request ID
   * @returns {Promise<import('../types/index.js').Request>} Updated request
   */
  async discardDraftChanges(id) {
    const existing = await db.requests.get(id);
    if (!existing) {
      throw new Error('Request not found');
    }

    const updates = {
      has_draft_edits: false,
      draft_method: null,
      draft_url: null,
      draft_headers: null,
      draft_params: null,
      draft_path_params: null,
      draft_request_type: null,
      draft_content_type: null,
      draft_body: null,
      draft_form_data: null,
      draft_url_encoded_data: null
    };

    await db.requests.update(id, updates);
    return await db.requests.get(id);
  }

  // Secret operations
  
  /**
   * Creates a new secret (sensitive key-value pair)
   * @param {Object} secretData - The secret data
   * @param {string} secretData.key - Secret key (required)
   * @param {string} secretData.value - Secret value (required)
   * @param {string} [secretData.environment_id] - Environment ID
   * @param {string} [secretData.collection_id] - Collection ID
   * @returns {Promise<import('../types/index.js').Secret>} The created secret
   */
  async createSecret(secretData) {
    const secret = {
      id: generateUUID(),
      environment_id: secretData.environment_id || null,
      collection_id: secretData.collection_id || null,
      key: secretData.key,
      value: secretData.value
    };

    const id = await db.variables.add(secret);
    return await db.variables.get(id);
  }

  /**
   * Retrieves a secret by ID
   * @param {string} id - Secret ID
   * @returns {Promise<import('../types/index.js').Secret|undefined>} The secret or undefined if not found
   */
  async getSecret(id) {
    return await db.variables.get(id);
  }


  /**
   * Retrieves all secrets for a collection
   * @param {string} collectionId - Collection ID
   * @returns {Promise<import('../types/index.js').Secret[]>} Array of secrets in the collection
   */
  async getSecretsByCollection(collectionId) {
    return await db.variables.where('collection_id').equals(collectionId).toArray();
  }

  /**
   * Updates an existing secret
   * @param {string} id - Secret ID
   * @param {Partial<import('../types/index.js').Secret>} updates - Fields to update
   * @returns {Promise<import('../types/index.js').Secret>} The updated secret
   * @throws {Error} If secret not found
   */
  async updateSecret(id, updates) {
    const existing = await db.variables.get(id);
    if (!existing) {
      throw new Error('Variable not found');
    }

    const updatedData = {
      ...updates
    };

    await db.variables.update(id, updatedData);
    return await db.variables.get(id);
  }

  /**
   * Deletes a secret
   * @param {string} id - Secret ID
   * @returns {Promise<void>}
   */
  async deleteSecret(id) {
    return await db.variables.delete(id);
  }

  // Environment secret operations

  /**
   * Checks if encryption key is required for environment secrets
   * @returns {boolean} True if encryption key is needed
   */
  requiresEncryptionKey() {
    return !hasSessionKey();
  }

  /**
   * Adds a new encrypted secret to an environment
   * @param {Object} secretData - The secret data
   * @param {string} secretData.environment_id - Environment ID (required)
   * @param {string} secretData.key - Secret key (required)
   * @param {string} secretData.value - Secret value (required)
   * @returns {Promise<import('../types/index.js').Environment>} The updated environment
   * @throws {Error} If encryption fails or no encryption key available
   */
  async createEnvironmentSecret(secretData) {
    if (!secretData.environment_id || !secretData.key || !secretData.value) {
      throw new Error('Environment ID, key, and value are required');
    }

    const environment = await db.environments.get(secretData.environment_id);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const { encrypted_value, iv } = await encryptSecret(secretData.value);

    const newSecret = {
      key: secretData.key,
      encrypted_value,
      iv
    };

    const updatedSecrets = [...(environment.secrets || []), newSecret];
    
    await db.environments.update(secretData.environment_id, { secrets: updatedSecrets });
    return await db.environments.get(secretData.environment_id);
  }

  /**
   * Retrieves all encrypted environment secrets for an environment
   * @param {string} environmentId - Environment ID
   * @returns {Promise<import('../types/index.js').EncryptedSecret[]>} Array of encrypted secrets
   */
  async getEnvironmentSecrets(environmentId) {
    const environment = await db.environments.get(environmentId);
    return environment?.secrets || [];
  }

  /**
   * Retrieves and decrypts all environment secrets for an environment
   * @param {string} environmentId - Environment ID
   * @returns {Promise<import('../types/index.js').DecryptedSecret[]>} Array of decrypted secrets
   * @throws {Error} If no encryption key available or decryption fails
   */
  async getDecryptedEnvironmentSecrets(environmentId) {
    const encryptedSecrets = await this.getEnvironmentSecrets(environmentId);
    const decryptedSecrets = [];

    for (const secret of encryptedSecrets) {
      try {
        const decryptedValue = await decryptSecret(secret.encrypted_value, secret.iv);
        decryptedSecrets.push({
          key: secret.key,
          value: decryptedValue
        });
      } catch (error) {
        console.error(`Failed to decrypt secret ${secret.key}:`, error);
        // Include the secret with an error indicator
        decryptedSecrets.push({
          key: secret.key,
          value: '[DECRYPTION_FAILED]'
        });
      }
    }

    return decryptedSecrets;
  }

  /**
   * Updates the secrets array for an environment
   * @param {string} environmentId - Environment ID
   * @param {import('../types/index.js').DecryptedSecret[]} secrets - Array of decrypted secrets
   * @returns {Promise<import('../types/index.js').Environment>} The updated environment
   * @throws {Error} If encryption fails or no encryption key available
   */
  async updateEnvironmentSecrets(environmentId, secrets) {
    const environment = await db.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const encryptedSecrets = [];
    for (const secret of secrets) {
      const { encrypted_value, iv } = await encryptSecret(secret.value);
      encryptedSecrets.push({
        key: secret.key,
        encrypted_value,
        iv
      });
    }

    await db.environments.update(environmentId, { secrets: encryptedSecrets });
    return await db.environments.get(environmentId);
  }

  /**
   * Counts the number of environment secrets for an environment
   * @param {string} environmentId - Environment ID
   * @returns {Promise<number>} Number of secrets
   */
  async countEnvironmentSecrets(environmentId) {
    const environment = await db.environments.get(environmentId);
    return environment?.secrets?.length || 0;
  }

  // Utility methods
  
  /**
   * Clears all data from the database (resets everything)
   * @returns {Promise<void>}
   */
  async clearAll() {
    await db.delete();
    await db.open();
  }

  /**
   * Exports all data from the database
   * @returns {Promise<import('../types/index.js').ExportData>} Complete database export
   */
  async exportData() {
    const data = {
      environments: await db.environments.toArray(),
      collections: await db.collections.toArray(),
      folders: await db.folders.toArray(),
      requests: await db.requests.toArray(),
      variables: await db.variables.toArray()
    };
    return data;
  }

  /**
   * Imports data into the database (clears existing data first)
   * @param {import('../types/index.js').ExportData} data - Data to import
   * @returns {Promise<void>}
   */
  async importData(data) {
    await this.clearAll();
    
    if (data.environments) await db.environments.bulkAdd(data.environments);
    if (data.collections) await db.collections.bulkAdd(data.collections);
    if (data.folders) await db.folders.bulkAdd(data.folders);
    if (data.requests) await db.requests.bulkAdd(data.requests);
    if (data.variables) await db.variables.bulkAdd(data.variables);
  }
}

/**
 * Pre-instantiated API client for convenient use
 * @type {SlingshotApiClient}
 */
export const apiClient = new SlingshotApiClient();
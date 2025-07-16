/**
 * @fileoverview Client-side API for managing RequestBite Slingshot data
 * Provides CRUD operations for environments, collections, folders, requests, and secrets
 * All data is stored locally in IndexedDB via Dexie
 */

import db from '../db/schema.js';
import { generateUUID } from '../utils/uuid.js';
import { validateRequest, validateEnvironment, validateCollection, validateFolder } from '../utils/validation.js';

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
      description: environmentData.description || ''
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
   * Deletes an environment and all related secrets
   * @param {string} id - Environment ID
   * @returns {Promise<void>}
   */
  async deleteEnvironment(id) {
    // Delete related secrets first
    await db.secrets.where('environment_id').equals(id).delete();
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
    await db.secrets.where('collection_id').equals(id).delete();
    
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
   * @param {string} requestData.url - Request URL (required)
   * @param {string} [requestData.method='GET'] - HTTP method
   * @param {string} [requestData.folder_id] - Folder ID
   * @param {import('../types/index.js').KeyValuePair[]} [requestData.headers] - Request headers
   * @param {import('../types/index.js').KeyValuePair[]} [requestData.params] - Query parameters
   * @param {import('../types/index.js').KeyValuePair[]} [requestData.path_params] - Path parameters
   * @param {string} [requestData.request_type='none'] - Request body type
   * @param {string} [requestData.content_type='json'] - Content type
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
      url: requestData.url,
      headers: requestData.headers || [],
      params: requestData.params || [],
      path_params: requestData.path_params || [],
      request_type: requestData.request_type || 'none',
      content_type: requestData.content_type || 'json',
      body: requestData.body || '',
      form_data: requestData.form_data || [],
      response_data: null,
      response_type: null,
      response_headers: null,
      response_status: null,
      response_time: null,
      response_size: null,
      response_received_at: null
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
   * Deletes a request
   * @param {string} id - Request ID
   * @returns {Promise<void>}
   */
  async deleteRequest(id) {
    return await db.requests.delete(id);
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

    const id = await db.secrets.add(secret);
    return await db.secrets.get(id);
  }

  /**
   * Retrieves a secret by ID
   * @param {string} id - Secret ID
   * @returns {Promise<import('../types/index.js').Secret|undefined>} The secret or undefined if not found
   */
  async getSecret(id) {
    return await db.secrets.get(id);
  }

  /**
   * Retrieves all secrets for an environment
   * @param {string} environmentId - Environment ID
   * @returns {Promise<import('../types/index.js').Secret[]>} Array of secrets in the environment
   */
  async getSecretsByEnvironment(environmentId) {
    return await db.secrets.where('environment_id').equals(environmentId).toArray();
  }

  /**
   * Retrieves all secrets for a collection
   * @param {string} collectionId - Collection ID
   * @returns {Promise<import('../types/index.js').Secret[]>} Array of secrets in the collection
   */
  async getSecretsByCollection(collectionId) {
    return await db.secrets.where('collection_id').equals(collectionId).toArray();
  }

  /**
   * Updates an existing secret
   * @param {string} id - Secret ID
   * @param {Partial<import('../types/index.js').Secret>} updates - Fields to update
   * @returns {Promise<import('../types/index.js').Secret>} The updated secret
   * @throws {Error} If secret not found
   */
  async updateSecret(id, updates) {
    const existing = await db.secrets.get(id);
    if (!existing) {
      throw new Error('Secret not found');
    }

    const updatedData = {
      ...updates
    };

    await db.secrets.update(id, updatedData);
    return await db.secrets.get(id);
  }

  /**
   * Deletes a secret
   * @param {string} id - Secret ID
   * @returns {Promise<void>}
   */
  async deleteSecret(id) {
    return await db.secrets.delete(id);
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
      secrets: await db.secrets.toArray()
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
    if (data.secrets) await db.secrets.bulkAdd(data.secrets);
  }
}

/**
 * Pre-instantiated API client for convenient use
 * @type {SlingshotApiClient}
 */
export const apiClient = new SlingshotApiClient();
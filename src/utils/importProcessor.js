/**
 * @fileoverview Shared import processing utility for OpenAPI and Postman collections
 * Used by URLImportModal and ReImportModal to avoid code duplication
 */

import { apiClient } from '../api';

/**
 * Process and import an OpenAPI spec or Postman collection
 * Creates collection, variables/secrets, folders, and requests in IndexedDB
 *
 * @param {Object} options - Import configuration
 * @param {string} options.content - Raw file content (JSON or YAML string)
 * @param {string} options.format - Format type: 'openapi' or 'postman'
 * @param {string} options.collectionName - Name for the collection
 * @param {Object} options.serverSelection - Optional server selection for OpenAPI 3.x
 * @param {string} options.sourceUrl - Optional source URL for re-import tracking
 * @param {string} options.environmentId - Optional environment ID (for re-import)
 * @param {number} options.timeout - Optional request timeout in ms
 * @param {boolean} options.followRedirects - Optional redirect following setting
 * @param {boolean} options.parseAnsiColors - Optional ANSI color parsing setting
 *
 * @returns {Promise<Object>} Created collection with metadata
 */
export async function processImport({
  content,
  format,
  collectionName,
  serverSelection = null,
  sourceUrl = null,
  environmentId = null,
  timeout = null,
  followRedirects = null,
  parseAnsiColors = null
}) {
  let processedData;

  // Process based on detected format using dynamic imports
  if (format === 'openapi') {
    const { processOpenAPISpec } = await import('./openApiProcessor');
    processedData = await processOpenAPISpec(content, collectionName, serverSelection);
  } else if (format === 'postman') {
    const { processPostmanCollection } = await import('./postmanImporter');
    processedData = await processPostmanCollection(content, collectionName);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  // Create collection using our API client
  const collection = await apiClient.createCollection({
    name: processedData.collectionName,
    description: processedData.description || '',
    variables: processedData.variables || [],
    security_schemes: processedData.securitySchemes || null,
    source_openapi_url: sourceUrl || null,
    environment_id: environmentId || null,
    timeout: timeout !== null ? timeout : 30000,
    follow_redirects: followRedirects !== null ? followRedirects : true,
    parse_ansi_colors: parseAnsiColors !== null ? parseAnsiColors : false
  });

  // Create individual variable records for collection management UI
  for (const variable of processedData.variables || []) {
    await apiClient.createSecret({
      collection_id: collection.id,
      key: variable.key,
      value: variable.value,
      description: variable.description || ''
    });
  }

  // Create folders and requests
  const folderMap = new Map();

  if (format === 'postman') {
    // Use hierarchical folder creation for Postman collections
    const createFoldersRecursively = async (parentId = null) => {
      const foldersAtLevel = processedData.folders.filter(f => f.parent_folder_id === parentId);

      for (const folderData of foldersAtLevel) {
        const folder = await apiClient.createFolder({
          name: folderData.name,
          collection_id: collection.id,
          parent_folder_id: folderData.parent_folder_id ? folderMap.get(folderData.parent_folder_id) : null,
          description: folderData.description || ''
        });
        folderMap.set(folderData.id, folder.id);

        // Create child folders
        await createFoldersRecursively(folderData.id);
      }
    };

    await createFoldersRecursively();

    // Create requests with folderId lookup
    for (const requestData of processedData.requests) {
      const folderId = requestData.folderId ? folderMap.get(requestData.folderId) : null;

      await apiClient.createRequest({
        collection_id: collection.id,
        folder_id: folderId,
        name: requestData.name,
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers || [],
        params: requestData.params || [],
        path_params: requestData.pathParams || [],
        request_type: requestData.requestType || 'none',
        content_type: requestData.contentType || 'json',
        body: requestData.body || '',
        form_data: requestData.formData || [],
        url_encoded_data: requestData.urlEncodedData || [],
        // Include OpenAPI metadata
        description: requestData.description,
        summary: requestData.summary,
        operation_id: requestData.operation_id,
        tags: requestData.tags,
        parameters_schema: requestData.parameters_schema,
        request_body_schema: requestData.request_body_schema,
        response_schemas: requestData.response_schemas
      });
    }
  } else {
    // Use simple folder creation for OpenAPI specs
    for (const folderName of processedData.folders) {
      const folder = await apiClient.createFolder({
        name: folderName,
        collection_id: collection.id
      });
      folderMap.set(folderName, folder.id);
    }

    // Create requests with folderName lookup
    for (const requestData of processedData.requests) {
      const folderId = requestData.folderName ? folderMap.get(requestData.folderName) : null;

      await apiClient.createRequest({
        collection_id: collection.id,
        folder_id: folderId,
        name: requestData.name,
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers || [],
        params: requestData.params || [],
        path_params: requestData.pathParams || [],
        request_type: requestData.requestType || 'none',
        content_type: requestData.contentType || 'json',
        body: requestData.body || '',
        // Include OpenAPI metadata
        description: requestData.description,
        summary: requestData.summary,
        operation_id: requestData.operation_id,
        tags: requestData.tags,
        parameters_schema: requestData.parameters_schema,
        request_body_schema: requestData.request_body_schema,
        response_schemas: requestData.response_schemas
      });
    }
  }

  // Return collection with metadata
  return {
    collection,
    folderCount: Array.isArray(processedData.folders) ? processedData.folders.length : processedData.folders.size,
    requestCount: processedData.requests.length
  };
}

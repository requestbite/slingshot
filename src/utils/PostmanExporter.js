import { apiClient } from '../api';

export class PostmanExporter {
  static async exportCollection(collectionId) {
    try {
      // Fetch collection data
      const collection = await apiClient.getCollection(collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }

      // Fetch requests and folders
      const [requests, folders, variables] = await Promise.all([
        apiClient.getRequestsByCollection(collectionId),
        apiClient.getFoldersByCollection(collectionId),
        apiClient.getSecretsByCollection(collectionId)
      ]);

      // Build the Postman collection structure
      const postmanCollection = {
        info: {
          _postman_id: collection.id,
          name: collection.name,
          description: collection.description || '',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [],
        variable: this.convertVariables(variables)
      };

      // Organize items by folders
      const folderMap = this.buildFolderMap(folders);
      const requestsByFolder = this.groupRequestsByFolder(requests);

      // Add root-level requests (no folder)
      if (requestsByFolder[null]) {
        requestsByFolder[null].forEach(request => {
          postmanCollection.item.push(this.convertRequest(request));
        });
      }

      // Add folders and their requests
      folders
        .filter(folder => !folder.parent_folder_id) // Only root folders
        .forEach(folder => {
          const folderItem = this.convertFolder(folder, requestsByFolder, folderMap);
          postmanCollection.item.push(folderItem);
        });

      return postmanCollection;
    } catch (error) {
      console.error('Error exporting collection:', error);
      throw error;
    }
  }

  static buildFolderMap(folders) {
    const folderMap = {};
    folders.forEach(folder => {
      folderMap[folder.id] = folder;
    });
    return folderMap;
  }

  static groupRequestsByFolder(requests) {
    const grouped = {};
    requests.forEach(request => {
      const folderId = request.folder_id || null;
      if (!grouped[folderId]) {
        grouped[folderId] = [];
      }
      grouped[folderId].push(request);
    });
    return grouped;
  }

  static convertFolder(folder, requestsByFolder, folderMap) {
    const folderItem = {
      name: folder.name,
      item: []
    };

    // Add requests in this folder
    if (requestsByFolder[folder.id]) {
      requestsByFolder[folder.id].forEach(request => {
        folderItem.item.push(this.convertRequest(request));
      });
    }

    // Add subfolders (simplified - only one level deep for Postman compatibility)
    Object.values(folderMap)
      .filter(subfolder => subfolder.parent_folder_id === folder.id)
      .forEach(subfolder => {
        const subfolderItem = this.convertFolder(subfolder, requestsByFolder, folderMap);
        folderItem.item.push(subfolderItem);
      });

    return folderItem;
  }

  static convertRequest(request) {
    const postmanRequest = {
      name: request.name || 'Untitled Request',
      request: {
        method: request.method || 'GET',
        header: this.convertHeaders(request.headers),
        url: this.convertUrl(request.url, request.params, request.path_params)
      }
    };

    // Add body if present
    if (request.body || request.form_data || request.url_encoded_data) {
      postmanRequest.request.body = this.convertBody(request);
    }

    return postmanRequest;
  }

  static convertHeaders(headers) {
    if (!headers || !Array.isArray(headers)) return [];
    
    return headers
      .filter(header => header.key && header.key.trim())
      .map(header => ({
        key: header.key.trim(),
        value: header.value || '',
        disabled: header.disabled || false
      }));
  }

  static convertUrl(url, queryParams, _pathParams) {
    if (!url) return '';

    // Handle string URL
    if (typeof url === 'string') {
      const urlObj = {
        raw: url,
        protocol: '',
        host: [],
        path: [],
        query: this.convertQueryParams(queryParams)
      };

      try {
        const parsedUrl = new URL(url);
        urlObj.protocol = parsedUrl.protocol.replace(':', '');
        urlObj.host = parsedUrl.hostname.split('.');
        urlObj.path = parsedUrl.pathname.split('/').filter(segment => segment);
        
        // Add port if not default
        if (parsedUrl.port && 
            !((parsedUrl.protocol === 'http:' && parsedUrl.port === '80') ||
              (parsedUrl.protocol === 'https:' && parsedUrl.port === '443'))) {
          urlObj.port = parsedUrl.port;
        }
      } catch (_e) {
        // If URL parsing fails, return as raw string
        return url;
      }

      return urlObj;
    }

    // If url is already an object, convert it
    return {
      raw: url.raw || '',
      protocol: url.protocol || '',
      host: Array.isArray(url.host) ? url.host : (url.host ? [url.host] : []),
      path: Array.isArray(url.path) ? url.path : (url.path ? [url.path] : []),
      query: this.convertQueryParams(queryParams),
      port: url.port
    };
  }

  static convertQueryParams(params) {
    if (!params || !Array.isArray(params)) return [];
    
    return params
      .filter(param => param.key && param.key.trim())
      .map(param => ({
        key: param.key.trim(),
        value: param.value || '',
        disabled: param.disabled || false
      }));
  }

  static convertBody(request) {
    const body = {};

    // Determine body mode based on request type
    if (request.request_type === 'form-data' && request.form_data) {
      body.mode = 'formdata';
      body.formdata = request.form_data
        .filter(item => item.key && item.key.trim())
        .map(item => ({
          key: item.key.trim(),
          value: item.value || '',
          disabled: item.disabled || false,
          type: item.type || 'text'
        }));
    } else if (request.request_type === 'urlencoded' && request.url_encoded_data) {
      body.mode = 'urlencoded';
      body.urlencoded = request.url_encoded_data
        .filter(item => item.key && item.key.trim())
        .map(item => ({
          key: item.key.trim(),
          value: item.value || '',
          disabled: item.disabled || false
        }));
    } else if (request.body) {
      body.mode = 'raw';
      body.raw = request.body;
      
      // Add options based on content type
      if (request.content_type) {
        body.options = {
          raw: {
            language: this.getLanguageFromContentType(request.content_type)
          }
        };
      }
    }

    return body;
  }

  static getLanguageFromContentType(contentType) {
    if (!contentType) return 'text';
    
    const type = contentType.toLowerCase();
    if (type.includes('json')) return 'json';
    if (type.includes('xml')) return 'xml';
    if (type.includes('html')) return 'html';
    if (type.includes('javascript')) return 'javascript';
    return 'text';
  }

  static convertVariables(variables) {
    if (!variables || !Array.isArray(variables)) return [];
    
    return variables
      .filter(variable => variable.key && variable.key.trim())
      .map(variable => ({
        key: variable.key.trim(),
        value: variable.value || '',
        type: 'string'
      }));
  }
}
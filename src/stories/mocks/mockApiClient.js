/**
 * Mock API client for Storybook stories
 * Simulates the real apiClient behavior without database operations
 */

import {
  mockCollections,
  mockCollection,
  mockRequests,
  mockRequest,
  mockEnvironments,
  mockEnvironment,
  mockFolders,
  mockFolder,
} from './mockData';

export const mockApiClient = {
  // Collections
  getAllCollections: async () => {
    return Promise.resolve([...mockCollections]);
  },

  getCollection: async (id) => {
    const collection = mockCollections.find(c => c.id === id);
    return Promise.resolve(collection || mockCollection);
  },

  createCollection: async (data) => {
    const newCollection = {
      id: `col-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return Promise.resolve(newCollection);
  },

  updateCollection: async (id, data) => {
    const collection = mockCollections.find(c => c.id === id) || mockCollection;
    return Promise.resolve({
      ...collection,
      ...data,
      updated_at: new Date().toISOString(),
    });
  },

  deleteCollection: async (id) => {
    return Promise.resolve({ success: true });
  },

  // Requests
  getRequest: async (id) => {
    const request = mockRequests.find(r => r.id === id);
    return Promise.resolve(request || mockRequest);
  },

  getRequestsByCollection: async (collectionId) => {
    return Promise.resolve(mockRequests.filter(r => r.collection_id === collectionId));
  },

  createRequest: async (data) => {
    const newRequest = {
      id: `req-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return Promise.resolve(newRequest);
  },

  updateRequest: async (id, data) => {
    const request = mockRequests.find(r => r.id === id) || mockRequest;
    return Promise.resolve({
      ...request,
      ...data,
      updated_at: new Date().toISOString(),
    });
  },

  deleteRequest: async (id) => {
    return Promise.resolve({ success: true });
  },

  duplicateRequest: async (id) => {
    const original = mockRequests.find(r => r.id === id) || mockRequest;
    const duplicate = {
      ...original,
      id: `req-${Date.now()}`,
      name: `${original.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return Promise.resolve(duplicate);
  },

  // Environments
  getAllEnvironments: async () => {
    return Promise.resolve([...mockEnvironments]);
  },

  getEnvironment: async (id) => {
    const environment = mockEnvironments.find(e => e.id === id);
    return Promise.resolve(environment || mockEnvironment);
  },

  createEnvironment: async (data) => {
    const newEnvironment = {
      id: `env-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return Promise.resolve(newEnvironment);
  },

  updateEnvironment: async (id, data) => {
    const environment = mockEnvironments.find(e => e.id === id) || mockEnvironment;
    return Promise.resolve({
      ...environment,
      ...data,
      updated_at: new Date().toISOString(),
    });
  },

  deleteEnvironment: async (id) => {
    return Promise.resolve({ success: true });
  },

  getDecryptedEnvironmentSecrets: async (environmentId) => {
    const environment = mockEnvironments.find(e => e.id === environmentId) || mockEnvironment;
    return Promise.resolve(environment.variables || []);
  },

  // Folders
  getFoldersByCollection: async (collectionId) => {
    return Promise.resolve(mockFolders.filter(f => f.collection_id === collectionId));
  },

  createFolder: async (data) => {
    const newFolder = {
      id: `folder-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return Promise.resolve(newFolder);
  },

  updateFolder: async (id, data) => {
    const folder = mockFolders.find(f => f.id === id) || mockFolder;
    return Promise.resolve({
      ...folder,
      ...data,
      updated_at: new Date().toISOString(),
    });
  },

  deleteFolder: async (id) => {
    return Promise.resolve({ success: true });
  },

  // Secrets/Variables
  getSecretsByCollection: async (collectionId) => {
    return Promise.resolve(mockCollection.variables || []);
  },

  createSecret: async (data) => {
    return Promise.resolve({
      id: `secret-${Date.now()}`,
      ...data,
    });
  },

  updateSecret: async (id, data) => {
    return Promise.resolve({
      id,
      ...data,
    });
  },

  deleteSecret: async (id) => {
    return Promise.resolve({ success: true });
  },
};

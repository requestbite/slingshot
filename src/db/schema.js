/**
 * @fileoverview Dexie IndexedDB schema for RequestBite Slingshot client-side storage
 * Defines the database structure for environments, collections, folders, requests, and secrets
 */

import Dexie from 'dexie';

/**
 * IndexedDB database instance for RequestBite Slingshot
 * @type {Dexie}
 */
export const db = new Dexie('RequestBiteSlingshotDB');

/**
 * Database schema definition
 * Defines tables and their indexes for efficient querying
 */
db.version(1).stores({
  /** Environment table with indexes on id, name, description */
  environments: '++id, name, description',
  /** Collection table with indexes on id, name, description, environment_id */
  collections: '++id, name, description, environment_id',
  /** Folder table with indexes on id, collection_id, parent_folder_id, name */
  folders: '++id, collection_id, parent_folder_id, name',
  /** Request table with indexes on id, collection_id, folder_id, name, method, url */
  requests: '++id, collection_id, folder_id, name, method, url',
  /** Secret table with indexes on id, environment_id, collection_id, key, value */
  secrets: '++id, environment_id, collection_id, key, value',
});

/**
 * Environment entity class definition
 * Represents an environment (dev, staging, prod, etc.) with its configuration
 */
db.environments.defineClass({
  id: String,
  name: String,
  description: String,
});

/**
 * Collection entity class definition
 * Represents a collection of API requests, similar to Postman collections
 */
db.collections.defineClass({
  id: String,
  environment_id: String,
  name: String,
  description: String,
  variables: Array,
});

/**
 * Folder entity class definition
 * Represents a folder that can contain requests and other folders (hierarchical structure)
 */
db.folders.defineClass({
  id: String,
  collection_id: String,
  parent_folder_id: String,
  name: String,
});

/**
 * Request entity class definition
 * Represents an HTTP request with all its configuration and cached response data
 */
db.requests.defineClass({
  id: String,
  collection_id: String,
  folder_id: String,
  name: String,
  method: String,
  url: String,
  headers: Array,
  params: Array,
  path_params: Array,
  request_type: String,
  content_type: String,
  body: String,
  form_data: Array,
  response_data: String,
  response_type: String,
  response_headers: Object,
  response_status: Number,
  response_time: Number,
  response_size: Number,
  response_received_at: Date,
});

/**
 * Secret entity class definition
 * Represents sensitive key-value pairs associated with environments or collections
 */
db.secrets.defineClass({
  id: String,
  environment_id: String,
  collection_id: String,
  key: String,
  value: String,
});

export default db;

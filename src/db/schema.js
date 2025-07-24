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
  /** Variable table with indexes on id, environment_id, collection_id, key, value */
  variables: '++id, environment_id, collection_id, key, value',
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
  follow_redirects: Boolean,
  timeout: Number,
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
  url_encoded_data: Array,
  // Response fields from proxy
  response_data: String,
  response_type: String,
  response_headers: Object,
  response_status: Number,
  response_status_text: String,
  response_time: String, // Formatted string like "123.45 ms"
  response_size: String, // Formatted string like "1.2 KB"
  response_raw_time: Number, // Raw milliseconds
  response_raw_size: Number, // Raw bytes
  response_is_binary: Boolean,
  response_binary_data: String, // Base64 encoded binary data
  response_cancelled: Boolean,
  response_success: Boolean,
  response_error_type: String,
  response_error_title: String,
  response_error_message: String,
  response_received_at: Date,
  // Draft fields for request editing
  has_draft_edits: Boolean,
  draft_method: String,
  draft_url: String,
  draft_headers: Array,
  draft_params: Array,
  draft_path_params: Array,
  draft_request_type: String,
  draft_content_type: String,
  draft_body: String,
  draft_form_data: Array,
  draft_url_encoded_data: Array,
});

/**
 * Variable entity class definition
 * Represents key-value pairs associated with environments or collections
 */
db.variables.defineClass({
  id: String,
  environment_id: String,
  collection_id: String,
  key: String,
  value: String,
});

export default db;

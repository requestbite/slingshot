/**
 * @typedef {Object} Environment
 * @property {string} id - Unique identifier (UUID)
 * @property {string} name - Environment name
 * @property {string} description - Environment description
 */

/**
 * @typedef {Object} KeyValuePair
 * @property {string} key - The key
 * @property {string} value - The value
 */

/**
 * @typedef {Object} Collection
 * @property {string} id - Unique identifier (UUID)
 * @property {string|null} environment_id - Reference to environment (nullable)
 * @property {string} name - Collection name
 * @property {string} description - Collection description
 * @property {KeyValuePair[]} variables - Collection variables (not encrypted)
 */

/**
 * @typedef {Object} Folder
 * @property {string} id - Unique identifier (UUID)
 * @property {string} collection_id - Reference to collection
 * @property {string|null} parent_folder_id - Reference to parent folder (nullable)
 * @property {string} name - Folder name
 */


/**
 * @typedef {Object} FormDataItem
 * @property {string} key - The key
 * @property {string} value - The value
 * @property {string} type - The type (text, file, etc.)
 */

/**
 * @typedef {Object} Request
 * @property {string} id - Unique identifier (UUID)
 * @property {string} collection_id - Reference to collection
 * @property {string|null} folder_id - Reference to folder (nullable)
 * @property {string} name - Request name
 * @property {string} method - HTTP method (GET, POST, etc.)
 * @property {string} url - Request URL
 * @property {KeyValuePair[]} headers - Request headers
 * @property {KeyValuePair[]} params - Query parameters
 * @property {KeyValuePair[]} path_params - Path parameters
 * @property {string} request_type - Request body type (none, raw, form, urlencoded)
 * @property {string} content_type - Content type (json, xml, text)
 * @property {string} body - Request body
 * @property {FormDataItem[]} form_data - Form data items
 * @property {string|null} response_data - Response content
 * @property {string|null} response_type - Response content type
 * @property {Object|null} response_headers - Response headers
 * @property {number|null} response_status - HTTP status code
 * @property {number|null} response_time - Request time in ms
 * @property {number|null} response_size - Response size in bytes
 * @property {Date|null} response_received_at - When response was received
 */

/**
 * @typedef {Object} Variable
 * @property {string} id - Unique identifier (UUID)
 * @property {string|null} environment_id - Reference to environment (nullable)
 * @property {string|null} collection_id - Reference to collection (nullable)
 * @property {string} key - Variable key
 * @property {string} value - Variable value
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of validation error messages
 */

/**
 * @typedef {Object} ResponseData
 * @property {string} data - Response content
 * @property {string} type - Response content type
 * @property {Object} headers - Response headers
 * @property {number} status - HTTP status code
 * @property {number} time - Request time in ms
 * @property {number} size - Response size in bytes
 */

/**
 * @typedef {Object} ExportData
 * @property {Environment[]} environments - All environments
 * @property {Collection[]} collections - All collections
 * @property {Folder[]} folders - All folders
 * @property {Request[]} requests - All requests
 * @property {Variable[]} variables - All variables
 */

export {};

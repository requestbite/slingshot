/**
 * @fileoverview Validation utilities and constants for RequestBite Slingshot
 * Provides validation functions and constants for all entity types
 */

/** @type {string[]} Valid HTTP methods */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/** @type {string[]} Valid request body types */
export const REQUEST_TYPES = ['none', 'raw', 'form', 'urlencoded'];

/** @type {string[]} Valid content types */
export const CONTENT_TYPES = ['json', 'xml', 'text'];

/**
 * Validates request data
 * @param {Object} request - Request data to validate
 * @param {string} request.name - Request name
 * @param {string} request.method - HTTP method
 * @param {string} request.url - Request URL
 * @param {string} [request.request_type] - Request body type
 * @param {string} [request.content_type] - Content type
 * @returns {import('../types/index.js').ValidationResult} Validation result
 */
export function validateRequest(request) {
  const errors = [];

  if (!request.name?.trim()) {
    errors.push('Request name is required');
  }

  if (!HTTP_METHODS.includes(request.method)) {
    errors.push('Invalid HTTP method');
  }

  if (!request.url?.trim()) {
    errors.push('Request URL is required');
  }

  if (request.request_type && !REQUEST_TYPES.includes(request.request_type)) {
    errors.push('Invalid request type');
  }

  if (request.content_type && !CONTENT_TYPES.includes(request.content_type)) {
    errors.push('Invalid content type');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates environment data
 * @param {Object} environment - Environment data to validate
 * @param {string} environment.name - Environment name
 * @returns {import('../types/index.js').ValidationResult} Validation result
 */
export function validateEnvironment(environment) {
  const errors = [];

  if (!environment.name?.trim()) {
    errors.push('Environment name is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates collection data
 * @param {Object} collection - Collection data to validate
 * @param {string} collection.name - Collection name
 * @returns {import('../types/index.js').ValidationResult} Validation result
 */
export function validateCollection(collection) {
  const errors = [];

  if (!collection.name?.trim()) {
    errors.push('Collection name is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates folder data
 * @param {Object} folder - Folder data to validate
 * @param {string} folder.name - Folder name
 * @param {string} folder.collection_id - Collection ID
 * @returns {import('../types/index.js').ValidationResult} Validation result
 */
export function validateFolder(folder) {
  const errors = [];

  if (!folder.name?.trim()) {
    errors.push('Folder name is required');
  }

  if (!folder.collection_id) {
    errors.push('Collection ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
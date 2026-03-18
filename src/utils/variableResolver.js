/**
 * Variable resolution utility for processing {{variable}} patterns
 * Used by CurlExportModal and other components that need to resolve variables
 */

import { apiClient } from '../api';

/**
 * Resolves {{variable}} patterns in text with actual variable values
 * @param {string} text - Text containing {{variable}} patterns
 * @param {Object} collection - Collection object with variables and environment info
 * @returns {Promise<string>} - Text with variables resolved
 */
export async function resolveVariables(text, collection) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Load all available variables
  const variables = await loadVariables(collection);
  
  // Replace {{variable}} patterns with actual values
  return text.replace(/\{\{([^}]*)\}\}/g, (match, variableName) => {
    if (variables.has(variableName)) {
      return variables.get(variableName);
    }
    // Return original pattern if variable not found
    return match;
  });
}

/**
 * Resolves variables in an entire request data object
 * @param {Object} requestData - Request data object
 * @param {Object} collection - Collection object
 * @param {Object} [environment] - Currently active environment (overrides collection.environment_id)
 * @returns {Promise<{data: Object, hasResolvedSecrets: boolean}>} - Resolved request data and secret flag
 */
export async function resolveRequestVariables(requestData, collection, environment) {
  if (!requestData) {
    return { data: requestData, hasResolvedSecrets: false };
  }

  const { vars: variables, secretKeys } = await loadVariables(collection, environment);
  let hasResolvedSecrets = false;
  const resolveText = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\{\{([^}]*)\}\}/g, (match, variableName) => {
      if (variables.has(variableName)) {
        if (secretKeys.has(variableName)) hasResolvedSecrets = true;
        return variables.get(variableName);
      }
      return match;
    });
  };

  // Create a deep copy to avoid mutating original
  const resolved = JSON.parse(JSON.stringify(requestData));

  // Resolve URL
  if (resolved.url) {
    resolved.url = resolveText(resolved.url);
  }

  // Resolve headers
  if (resolved.headers && Array.isArray(resolved.headers)) {
    resolved.headers = resolved.headers.map(header => ({
      ...header,
      key: resolveText(header.key),
      value: resolveText(header.value)
    }));
  }

  // Resolve query parameters
  if (resolved.queryParams && Array.isArray(resolved.queryParams)) {
    resolved.queryParams = resolved.queryParams.map(param => ({
      ...param,
      key: resolveText(param.key),
      value: resolveText(param.value)
    }));
  }

  // Resolve path parameters
  if (resolved.pathParams && Array.isArray(resolved.pathParams)) {
    resolved.pathParams = resolved.pathParams.map(param => ({
      ...param,
      key: resolveText(param.key),
      value: resolveText(param.value)
    }));
  }

  // Resolve body content
  if (resolved.bodyContent) {
    resolved.bodyContent = resolveText(resolved.bodyContent);
  }

  // Resolve form data
  if (resolved.formData && Array.isArray(resolved.formData)) {
    resolved.formData = resolved.formData.map(field => ({
      ...field,
      key: resolveText(field.key),
      value: field.type === 'text' ? resolveText(field.value) : field.value
    }));
  }

  // Resolve URL encoded data
  if (resolved.urlEncodedData && Array.isArray(resolved.urlEncodedData)) {
    resolved.urlEncodedData = resolved.urlEncodedData.map(field => ({
      ...field,
      key: resolveText(field.key),
      value: resolveText(field.value)
    }));
  }

  return { data: resolved, hasResolvedSecrets };
}

/**
 * Loads all variables from collection, environment, and database
 * @param {Object} collection - Collection object
 * @param {Object} [environment] - Currently active environment (overrides collection.environment_id)
 * @returns {Promise<{vars: Map, secretKeys: Set}>} - Variable map and set of secret key names
 */
async function loadVariables(collection, environment) {
  const vars = new Map();
  const secretKeys = new Set();

  try {
    // Collection variables (inline) - not treated as secrets
    if (collection?.variables) {
      collection.variables.forEach(v => vars.set(v.key, v.value));
    }

    // Database collection variables - not treated as secrets for warning purposes
    if (collection?.id) {
      const collectionVars = await apiClient.getSecretsByCollection(collection.id);
      collectionVars.forEach(v => vars.set(v.key, v.value));
    }

    // Environment variables - prefer explicit environment over collection's default
    const environmentId = environment?.id || collection?.environment_id;
    if (environmentId) {
      const envVars = await apiClient.getDecryptedEnvironmentSecrets(environmentId);
      envVars.forEach(v => {
        vars.set(v.key, v.value);
        secretKeys.add(v.key);
      });
    }
  } catch (error) {
    console.error('Failed to load variables:', error);
  }

  return { vars, secretKeys };
}
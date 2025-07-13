/**
 * @fileoverview UUID generation and validation utilities
 * Provides functions for creating and validating UUIDs
 */

/**
 * Generates a new UUID v4 using the Web Crypto API
 * @returns {string} A new UUID string
 */
export function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Validates if a string is a properly formatted UUID
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if the string is a valid UUID, false otherwise
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
/**
 * @fileoverview HTTP method utilities and styling
 */

export const HTTP_METHOD_COLORS = {
  GET: 'bg-green-400',
  POST: 'bg-orange-300',
  PUT: 'bg-blue-400',
  DELETE: 'bg-rose-400',
  PATCH: 'bg-purple-400',
  HEAD: 'bg-lime-400',
  OPTIONS: 'bg-pink-400',
  default: 'bg-gray-400'
};

/**
 * Gets the background color class for an HTTP method
 * @param {string} method - HTTP method
 * @returns {string} Tailwind background color class
 */
export function getMethodColor(method) {
  return HTTP_METHOD_COLORS[method?.toUpperCase()] || HTTP_METHOD_COLORS.default;
}

/**
 * Gets all available HTTP methods
 * @returns {string[]} Array of HTTP methods
 */
export function getHttpMethods() {
  return Object.keys(HTTP_METHOD_COLORS).filter(key => key !== 'default');
}
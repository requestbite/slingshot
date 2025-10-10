/**
 * Mock router for Storybook stories
 * Simulates wouter-preact routing without actual navigation
 */

import { Router } from 'wouter-preact';
import { useState, useEffect } from 'preact/hooks';

/**
 * Creates a mock location hook for testing
 */
export const createMockLocationHook = (initialPath = '/') => {
  return () => {
    const [location, setLocation] = useState(initialPath);
    return [location, setLocation];
  };
};

/**
 * Router decorator for Storybook stories
 * Wraps components that use routing
 *
 * Usage:
 * ```
 * export default {
 *   component: MyComponent,
 *   decorators: [withMockRouter()],
 * };
 * ```
 */
export const withMockRouter = (initialPath = '/') => (Story) => {
  const mockHook = createMockLocationHook(initialPath);

  return (
    <Router hook={mockHook}>
      <Story />
    </Router>
  );
};

/**
 * Default router decorator
 */
export const mockRouterDecorator = withMockRouter('/');

/**
 * Router decorator with collection selected
 */
export const collectionRouterDecorator = withMockRouter('/col-1');

/**
 * Router decorator with request selected
 */
export const requestRouterDecorator = withMockRouter('/col-1/req-1');

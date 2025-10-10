/**
 * Mock AppContext for Storybook stories
 */

import { AppContext } from '../../context/AppContext';
import { mockCollections, mockCollection, mockRequest, mockEnvironment } from './mockData';

/**
 * Creates a mock AppContext value with default or custom values
 */
export const createMockContext = (overrides = {}) => ({
  // Collections
  collections: mockCollections,
  selectedCollection: mockCollection,
  selectedRequest: mockRequest,
  currentEnvironment: mockEnvironment,
  hasManuallySelectedEnvironment: false,
  isLoading: false,
  isDocsSidebarVisible: true,

  // Actions
  loadCollections: async () => {},
  addCollection: (collection) => {},
  updateCollection: (collection) => {},
  removeCollection: (collectionId) => {},
  selectCollection: (collection) => {},
  selectRequest: (request) => {},
  setCurrentEnvironment: (environment) => {},
  setHasManuallySelectedEnvironment: (value) => {},
  setIsDocsSidebarVisible: (visible) => {},
  refreshCollectionData: () => {},

  // Override with any custom values
  ...overrides,
});

/**
 * AppContext decorator for Storybook stories
 * Wraps components in a mock AppContext.Provider
 *
 * Usage in stories:
 * ```
 * export default {
 *   component: MyComponent,
 *   decorators: [withMockContext()],
 * };
 * ```
 */
export const withMockContext = (contextOverrides = {}) => (Story, context) => {
  const mockValue = createMockContext(contextOverrides);

  return (
    <AppContext.Provider value={mockValue}>
      <Story {...context} />
    </AppContext.Provider>
  );
};

/**
 * Default decorator with basic context
 */
export const mockContextDecorator = withMockContext();

/**
 * Decorator for stories that need an empty/loading state
 */
export const emptyContextDecorator = withMockContext({
  collections: [],
  selectedCollection: null,
  selectedRequest: null,
  currentEnvironment: null,
  isLoading: false,
});

/**
 * Decorator for stories that are in a loading state
 */
export const loadingContextDecorator = withMockContext({
  collections: [],
  selectedCollection: null,
  selectedRequest: null,
  currentEnvironment: null,
  isLoading: true,
});

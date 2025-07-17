import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { AddCollectionModal } from '../components/modals/AddCollectionModal';
import { DeleteCollectionModal } from '../components/modals/DeleteCollectionModal';
import { useAppContext } from '../hooks/useAppContext';
import { apiClient } from '../api';

export function CollectionsPage() {
  const [, setLocation] = useLocation();
  const { collections, loadCollections, selectCollection } = useAppContext();
  const [collectionsWithCounts, setCollectionsWithCounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadCollectionsWithCounts();
  }, []);

  const loadCollectionsWithCounts = async () => {
    try {
      setIsLoading(true);
      
      // Load collections directly (don't depend on context)
      const allCollections = await apiClient.getAllCollections();
      
      const collectionsData = await Promise.all(
        allCollections.map(async (collection) => {
          try {
            // Get request count
            const requests = await apiClient.getRequestsByCollection(collection.id);
            const requestCount = requests.length;
            
            // Get secret count
            const secrets = await apiClient.getSecretsByCollection(collection.id);
            const secretCount = secrets.length;
            
            return {
              ...collection,
              request_count: requestCount,
              secret_count: secretCount
            };
          } catch (error) {
            console.error(`Error loading counts for collection ${collection.id}:`, error);
            return {
              ...collection,
              request_count: 0,
              secret_count: 0
            };
          }
        })
      );
      
      // Sort by name (matching Django ordering)
      collectionsData.sort((a, b) => a.name.localeCompare(b.name));
      setCollectionsWithCounts(collectionsData);
      
      // Also update the context collections for consistency
      await loadCollections();
      
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInAPIClient = (collection) => {
    selectCollection(collection);
    setLocation(`/${collection.id}`);
    setOpenDropdown(null);
  };

  const handleEditCollection = (collection) => {
    setLocation(`/collections/${collection.id}`);
    setOpenDropdown(null);
  };

  const handleDeleteCollection = (collection) => {
    setSelectedCollection(collection);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteSuccess = async () => {
    await loadCollectionsWithCounts();
    showNotification('Collection deleted successfully');
  };

  const handleCreateSuccess = async (collection) => {
    await loadCollectionsWithCounts();
    showNotification('Collection created successfully');
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const copyToClipboard = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification(message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div class="h-full flex flex-col">
      {/* Page Header */}
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Collections</h1>
              <p class="text-sm text-gray-600 mt-1">
                Manage your API request collections
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              class="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Collection
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class="flex-1 bg-gray-50 px-6 py-6">
        <div class="max-w-7xl mx-auto">
          {isLoading ? (
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div class="flex items-center justify-center">
                <div class="flex items-center space-x-3 text-gray-500">
                  <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading collections...</span>
                </div>
              </div>
            </div>
          ) : collectionsWithCounts.length === 0 ? (
            /* Empty State */
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
                <p class="text-gray-600 mb-6">
                  Create your first collection to start organizing your API requests
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  class="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Collection
                </button>
              </div>
            </div>
          ) : (
            /* Collections Table */
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requests
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Secrets/Variables
                    </th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {collectionsWithCounts.map((collection) => (
                    <tr key={collection.id} class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-sky-100 rounded-md flex items-center justify-center">
                              <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                          </div>
                          <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">
                              {collection.name}
                            </div>
                            {collection.description && (
                              <div class="text-sm text-gray-500">
                                {collection.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {collection.request_count}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {collection.secret_count}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === collection.id ? null : collection.id);
                            }}
                            class="inline-flex items-center px-3 py-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdown === collection.id && (
                            <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                              <div class="py-1">
                                <button
                                  onClick={() => handleOpenInAPIClient(collection)}
                                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                  <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Open in API client
                                </button>
                                <button
                                  onClick={() => handleEditCollection(collection)}
                                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                  <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit collection
                                </button>
                                <button
                                  onClick={() => handleDeleteCollection(collection)}
                                  class="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                                >
                                  <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete collection
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {notification && (
        <div class="fixed top-4 right-4 z-50">
          <div class="bg-green-50 border border-green-200 rounded-md p-4 max-w-sm">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm font-medium text-green-800">{notification}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Collection Modal */}
      <AddCollectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Collection Modal */}
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        collection={selectedCollection}
        onDelete={handleDeleteSuccess}
      />
    </div>
  );
}
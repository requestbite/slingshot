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
    <div class="h-full flex flex-col items-center bg-gray-100">
      {/* Main Container */}
      <div class="bg-white rounded-lg border border-gray-300 w-4xl mt-[83px]">
        {/* Header Section */}
        <div class="sm:flex sm:items-start p-6">
          <div class="sm:flex-auto">
            <h1 class="text-base/7 font-semibold text-gray-900">
              Collections
            </h1>
            <p class="mt-1 text-sm/6 text-gray-600">
              Manage your collections.
            </p>
          </div>
          <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              onClick={() => setShowAddModal(true)}
              type="button"
              class="cursor-pointer block rounded-md bg-sky-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-sky-400 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Add Collection
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div class="p-0 pt-6 sm:p-6">
          {isLoading ? (
            <div class="flex items-center justify-center p-8">
              <div class="flex items-center space-x-3 text-gray-500">
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading collections...</span>
              </div>
            </div>
          ) : collectionsWithCounts.length === 0 ? (
            <p class="px-6 sm:p-0">No collections found for this account.</p>
          ) : (
            <table class="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" class="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Name
                  </th>
                  <th scope="col" class="hidden lg:table-cell py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Requests
                  </th>
                  <th scope="col" class="hidden lg:table-cell py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Variables
                  </th>
                  <th scope="col" class="lg:table-cell pl-3 pr-6 py-3.5 sm:pr-0 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {collectionsWithCounts.map((collection) => (
                  <tr key={collection.id}>
                    <td class="w-full max-w-0 py-4 pl-6 pr-3 text-sm sm:w-auto sm:max-w-none sm:pl-0">
                      <a href="#" onClick={(e) => { e.preventDefault(); handleEditCollection(collection); }} class="text-sky-500 hover:text-sky-700 hover:underline">
                        {collection.name}
                      </a>
                    </td>
                    <td class="hidden lg:table-cell py-4 pl-6 pr-3 text-sm sm:w-auto sm:max-w-none sm:pl-0">
                      {collection.request_count}
                    </td>
                    <td class="hidden lg:table-cell py-4 pl-6 pr-3 text-sm sm:w-auto sm:max-w-none sm:pl-0">
                      {collection.secret_count}
                    </td>
                    <td class="lg:table-cell py-4 pl-3 pr-6 text-right text-sm sm:pr-0">
                      <div class="relative inline-block text-left">
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === collection.id ? null : collection.id);
                            }}
                            type="button"
                            class="cursor-pointer inline-flex items-center text-sky-500 hover:text-sky-700 hover:underline"
                            id={`collection-menu-button-${collection.id}`}
                            aria-expanded="false"
                            aria-haspopup="true"
                          >
                            <span class="sr-only">Open options menu for {collection.name}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </button>
                        </div>
                        {openDropdown === collection.id && (
                          <div class="absolute right-0 z-10 mt-2 w-60 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby={`collection-menu-button-${collection.id}`} tabindex="-1">
                            <button
                              onClick={() => handleOpenInAPIClient(collection)}
                              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              role="menuitem"
                              tabindex="-1"
                            >
                              Open in API client
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              onClick={() => handleEditCollection(collection)}
                              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              role="menuitem"
                              tabindex="-1"
                            >
                              Edit collection
                            </button>
                            <button
                              onClick={() => handleDeleteCollection(collection)}
                              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              role="menuitem"
                              tabindex="-1"
                            >
                              Delete collection ...
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

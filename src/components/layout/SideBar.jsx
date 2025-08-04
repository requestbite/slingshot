import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { OpenAPIImportModal } from '../import/OpenAPIImportModal';
import { PostmanImportModal } from '../import/PostmanImportModal';
import { AddFolderModal } from '../modals/AddFolderModal';
import { AddCollectionModal } from '../modals/AddCollectionModal';
import { ExportPostmanModal } from '../modals/ExportPostmanModal';
import { ContextMenu } from '../common/ContextMenu';
import { FolderTree } from '../sidebar/FolderTree';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { hasSessionKey } from '../../utils/encryption';

export function SideBar({ onClose: _onClose }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPostmanImportModal, setShowPostmanImportModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [showExportPostmanModal, setShowExportPostmanModal] = useState(false);
  const [showImportContextMenu, setShowImportContextMenu] = useState(false);
  const importButtonRef = useRef();
  const [searchTerm, setSearchTerm] = useState('');
  const [, setLocation] = useLocation();
  const { collections, selectedCollection, selectCollection, selectRequest, isLoading, updateCollection, currentEnvironment, setCurrentEnvironment } = useAppContext();

  // Environment state
  const [environments, setEnvironments] = useState([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);
  const [showDefaultSuccess, setShowDefaultSuccess] = useState(false);
  const hasManuallySelectedEnvironment = useRef(false);

  // Load environments when component mounts
  useEffect(() => {
    loadEnvironments();
  }, []);

  // Update current environment when selectedCollection changes, but respect manual selection
  useEffect(() => {
    if (selectedCollection) {
      // Only auto-set environment if user hasn't manually selected one
      if (!hasManuallySelectedEnvironment.current && selectedCollection.environment_id && environments.length > 0) {
        const environment = environments.find(env => env.id === selectedCollection.environment_id);
        setCurrentEnvironment(environment || null);
      } else if (!hasManuallySelectedEnvironment.current) {
        // No environment set or environment doesn't exist anymore
        setCurrentEnvironment(null);
      }
      // If user has manually selected an environment, don't override it
    } else {
      setCurrentEnvironment(null);
      hasManuallySelectedEnvironment.current = false; // Reset when no collection
    }
  }, [selectedCollection, environments, setCurrentEnvironment]);

  const loadEnvironments = async () => {
    // Only load environments if encryption key is available
    if (!hasSessionKey()) {
      setEnvironments([]);
      return;
    }

    try {
      setIsLoadingEnvironments(true);
      const allEnvironments = await apiClient.getAllEnvironments();
      // Sort alphabetically
      allEnvironments.sort((a, b) => a.name.localeCompare(b.name));
      setEnvironments(allEnvironments);
    } catch (error) {
      console.error('Failed to load environments:', error);
      setEnvironments([]);
    } finally {
      setIsLoadingEnvironments(false);
    }
  };

  const handleEnvironmentChange = (environmentId) => {
    hasManuallySelectedEnvironment.current = true; // Mark that user manually selected an environment
    if (environmentId === 'none') {
      setCurrentEnvironment(null);
    } else {
      const environment = environments.find(env => env.id === environmentId);
      setCurrentEnvironment(environment || null);
    }
  };

  const handleMakeDefault = async () => {
    if (!selectedCollection || isUpdatingDefault) {
      return;
    }

    try {
      setIsUpdatingDefault(true);
      const environmentId = currentEnvironment ? currentEnvironment.id : null;

      await apiClient.updateCollection(selectedCollection.id, {
        ...selectedCollection,
        environment_id: environmentId
      });

      // Fetch the updated collection from database to ensure we have latest data
      const updatedCollection = await apiClient.getCollection(selectedCollection.id);

      // Update both the selected collection and the collections cache
      selectCollection(updatedCollection);
      updateCollection(updatedCollection);

      // Show success feedback and fade back to blue
      setShowDefaultSuccess(true);
      setTimeout(() => {
        setShowDefaultSuccess(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to update collection environment:', error);
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  const isDefaultEnvironment = selectedCollection && (
    (currentEnvironment && selectedCollection.environment_id === currentEnvironment.id) ||
    (!currentEnvironment && !selectedCollection.environment_id)
  );

  return (
    <>
      {/* Sidebar */}
      <aside class="bg-white rounded-lg md:border border-gray-300 h-full">
        <div class="flex grow flex-col gap-y-5 overflow-y-auto p-4">
          <nav class="flex flex-1 flex-col space-y-4">
            {/* Import Button with Dropdown */}
            <div class="relative">
              <button
                ref={importButtonRef}
                onClick={() => setShowImportContextMenu(true)}
                class="w-full justify-between rounded-md bg-sky-100 hover:bg-sky-200 py-2 px-3 text-sm font-medium text-sky-700 flex items-center cursor-pointer"
              >
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                    <path d="M12 15V3" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                  Import
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* Collection Management */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label for="collection-select" class="block text-xs font-medium text-gray-600">Collection</label>
                <button
                  onClick={() => setShowAddCollectionModal(true)}
                  class="text-xs text-sky-600 hover:text-sky-800 focus:outline-none cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div class="relative">
                <select
                  id="collection-select"
                  class="w-full appearance-none rounded-md bg-white py-2 pl-3 pr-8 text-sm text-gray-900 outline -outline-offset-1 outline-gray-300 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
                  value={selectedCollection?.id || ''}
                  onChange={(e) => {
                    const collectionId = e.target.value;
                    if (collectionId) {
                      const collection = collections.find(c => c.id === collectionId);
                      if (collection) {
                        selectCollection(collection);
                        setLocation(`/${collectionId}`);
                      }
                    }
                  }}
                  disabled={isLoading}
                >
                  <option value="" disabled={collections.length > 0}>
                    {isLoading ? 'Loading...' : 'Pick a collection...'}
                  </option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} &middot; local
                    </option>
                  ))}
                </select>
                <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 h-4 w-4"
                  viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd"
                    d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div class="mt-2 flex space-x-2">
                {selectedCollection && (
                  <>
                    <a
                      href={selectedCollection ? `/collections/${selectedCollection.id}` : '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (selectedCollection) {
                          setLocation(`/collections/${selectedCollection.id}`);
                        }
                      }}
                      class="justify-center rounded-md bg-sky-100 hover:bg-sky-200 h-[30px] w-[30px] text-sm font-medium text-sky-700 flex items-center p-0 cursor-pointer no-underline"
                      title="Collection settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </a>
                    <button
                      onClick={() => setShowAddFolderModal(true)}
                      class="justify-center rounded-md bg-sky-100 hover:bg-sky-200 h-[30px] w-[30px] text-sm font-medium text-sky-700 flex items-center p-0 cursor-pointer"
                      title="Add folder to collection"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto">
                        <path d="M12 10v6" />
                        <path d="M9 13h6" />
                        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowExportPostmanModal(true)}
                      class="justify-center rounded-md bg-sky-100 hover:bg-sky-200 h-[30px] w-[30px] text-sm font-medium text-sky-700 flex items-center p-0 cursor-pointer"
                      title="Export as Postman collection"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto">
                        <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Environment Management */}
            {selectedCollection && (
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label for="environment-select" class="block text-xs font-medium text-gray-600">Environment</label>
                </div>
                <div class="relative">
                  <select
                    id="environment-select"
                    class="w-full appearance-none rounded-md bg-white py-2 pl-3 pr-8 text-sm text-gray-900 outline -outline-offset-1 outline-gray-300 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
                    value={currentEnvironment?.id || (currentEnvironment === null ? 'none' : '')}
                    onChange={(e) => {
                      const environmentId = e.target.value;
                      handleEnvironmentChange(environmentId);
                    }}
                    disabled={isLoadingEnvironments}
                  >
                    <option value="" disabled={environments.length > 0}>
                      {isLoadingEnvironments ? 'Loading...' : 'Pick an environment...'}
                    </option>
                    <option value="none">
                      No environment
                    </option>
                    {environments.map(environment => (
                      <option key={environment.id} value={environment.id}>
                        {environment.name} &middot; local
                      </option>
                    ))}
                  </select>
                  <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 h-4 w-4"
                    viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                      clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="mt-2 flex space-x-2">
                  <a
                    href={currentEnvironment ? `/environments/${currentEnvironment.id}` : '/environments'}
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentEnvironment) {
                        setLocation(`/environments/${currentEnvironment.id}`);
                      } else {
                        setLocation('/environments');
                      }
                    }}
                    class={`justify-center rounded-md h-[30px] w-[30px] text-sm font-medium flex items-center p-0 no-underline ${currentEnvironment || environments.length === 0
                      ? 'bg-sky-100 hover:bg-sky-200 text-sky-700 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    title="Environment settings"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </a>
                  <button
                    onClick={handleMakeDefault}
                    disabled={isUpdatingDefault || isDefaultEnvironment}
                    class={`flex-1 justify-center rounded-md h-[30px] text-xs font-medium flex items-center cursor-pointer transition-colors duration-300 ${showDefaultSuccess
                      ? 'bg-green-100 text-green-700'
                      : isDefaultEnvironment && !showDefaultSuccess
                        ? 'bg-sky-100 text-sky-700 cursor-default'
                        : !isUpdatingDefault
                          ? 'bg-sky-100 hover:bg-sky-200 text-sky-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    title={
                      isDefaultEnvironment
                        ? currentEnvironment
                          ? "This environment is already the default for this collection"
                          : "No environment is already the default for this collection"
                        : currentEnvironment
                          ? "Make environment the default for this collection"
                          : "Clear the default environment for this collection"
                    }
                  >
                    {isUpdatingDefault
                      ? 'Updating...'
                      : showDefaultSuccess
                        ? 'Updated!'
                        : isDefaultEnvironment
                          ? currentEnvironment
                            ? 'Default environment'
                            : 'No default environment'
                          : currentEnvironment
                            ? 'Make default'
                            : 'Clear default'
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Collection Tree View */}
            <div class="mt-4" style={{ display: selectedCollection ? 'block' : 'none' }}>
              {/* Local Collection Banner */}
              {selectedCollection && (
                <div class="mb-3 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-500 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="mr-1.5"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Local collection
                </div>
              )}
              <div class="flex justify-between items-center mb-2">
                <label class="block text-xs font-medium text-gray-600">Requests</label>
                {selectedCollection && (
                  <a
                    href={selectedCollection ? `/${selectedCollection.id}` : '#'}
                    onClick={(e) => {
                      e.preventDefault();
                      selectRequest(null); // Clear request editor fields
                      setLocation(`/${selectedCollection.id}`);
                    }}
                    class="text-xs text-sky-600 hover:text-sky-800 focus:outline-none cursor-pointer"
                  >
                    Add
                  </a>
                )}
              </div>

              {/* Filter input */}
              <div class="relative mb-2">
                <input
                  type="text"
                  placeholder="Filter requests..."
                  value={searchTerm}
                  onInput={(e) => setSearchTerm(e.target.value)}
                  class="w-full text-xs bg-white border border-gray-300 rounded-sm py-1 pl-7 pr-8 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder-gray-400"
                  disabled={!selectedCollection}
                />
                <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    class="absolute inset-y-0 right-0 pr-1 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div class="mt-2 overflow-y-auto overflow-x-visible relative">
                <FolderTree searchTerm={searchTerm} />
              </div>
            </div>

          </nav>
        </div>
      </aside>

      {/* OpenAPI Import Modal */}
      <OpenAPIImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={(collection) => {
          console.log('Collection imported successfully:', collection);
        }}
      />

      {/* Add Folder Modal */}
      <AddFolderModal
        isOpen={showAddFolderModal}
        onClose={() => setShowAddFolderModal(false)}
        onSuccess={(folder) => {
          console.log('Folder created successfully:', folder.name);
        }}
      />

      {/* Add Collection Modal */}
      <AddCollectionModal
        isOpen={showAddCollectionModal}
        onClose={() => setShowAddCollectionModal(false)}
        onSuccess={(collection) => {
          console.log('Collection created successfully:', collection.name);
        }}
      />

      {/* Export Postman Modal */}
      <ExportPostmanModal
        isOpen={showExportPostmanModal}
        onClose={() => setShowExportPostmanModal(false)}
        collection={selectedCollection}
      />

      {/* Postman Import Modal */}
      <PostmanImportModal
        isOpen={showPostmanImportModal}
        onClose={() => setShowPostmanImportModal(false)}
        onSuccess={(collection) => {
          console.log('Postman collection imported successfully:', collection);
        }}
      />

      {/* Import Context Menu */}
      <ContextMenu
        isOpen={showImportContextMenu}
        onClose={() => setShowImportContextMenu(false)}
        trigger={importButtonRef.current}
        width={200}
        position="below"
        items={[
          {
            label: 'OpenAPI spec',
            onClick: () => {
              setShowImportModal(true);
              setShowImportContextMenu(false);
            },
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            )
          },
          {
            label: 'Postman collection',
            onClick: () => {
              setShowPostmanImportModal(true);
              setShowImportContextMenu(false);
            },
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <circle cx="12" cy="13" r="2" />
                <path d="M12 11v6" />
              </svg>
            )
          }
        ]}
      />
    </>
  );
}

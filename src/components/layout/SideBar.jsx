import { useState } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { OpenAPIImportModal } from '../import/OpenAPIImportModal';
import { AddFolderModal } from '../modals/AddFolderModal';
import { AddCollectionModal } from '../modals/AddCollectionModal';
import { FolderTree } from '../sidebar/FolderTree';
import { useAppContext } from '../../hooks/useAppContext';

export function SideBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setLocation] = useLocation();
  const { collections, selectedCollection, selectCollection, selectRequest, isLoading } = useAppContext();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          class="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside class={`
        bg-white rounded-lg md:border border-gray-300 h-full
        md:translate-x-0 md:static md:z-auto
        fixed left-0 top-16 z-30
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div class="flex grow flex-col gap-y-5 overflow-y-auto p-4">
          <nav class="flex flex-1 flex-col space-y-4">
            {/* Import OpenAPI Button */}
            <div>
              <button
                onClick={() => setShowImportModal(true)}
                class="w-full justify-center rounded-md bg-sky-100 hover:bg-sky-200 py-2 text-sm font-medium text-sky-700 flex items-center cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                  <path d="M12 15V3" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m7 10 5 5 5-5" />
                </svg>
                Import OpenAPI
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
                  <option value="" disabled>
                    {isLoading ? 'Loading...' : 'Pick a collection...'}
                  </option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
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
                      onClick={() => selectedCollection && setLocation(`/collections/${selectedCollection.id}`)}
                      class="justify-center rounded-md bg-sky-100 hover:bg-sky-200 h-[30px] w-[30px] text-sm font-medium text-sky-700 flex items-center p-0 cursor-pointer"
                      title="Collection settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Collection Tree View */}
            <div class="mt-4" style={{ display: selectedCollection ? 'block' : 'none' }}>
              <div class="flex justify-between items-center mb-2">
                <label class="block text-xs font-medium text-gray-600">Requests</label>
                {selectedCollection && (
                  <button
                    onClick={() => {
                      selectRequest(null); // Clear request editor fields
                      setLocation(`/${selectedCollection.id}`);
                    }}
                    class="text-xs text-sky-600 hover:text-sky-800 focus:outline-none cursor-pointer"
                  >
                    Add
                  </button>
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
    </>
  );
}

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
  const { collections, selectedCollection, selectCollection, isLoading } = useAppContext();
  
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
        w-[300px] flex-shrink-0 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:z-auto
        fixed left-0 top-16 h-full z-30
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div class="p-4 space-y-4">
          {/* Environment Selector */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Environment</label>
            <select class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>No Environment</option>
            </select>
          </div>

          {/* Import OpenAPI Button */}
          <button 
            onClick={() => setShowImportModal(true)}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Import OpenAPI
          </button>

          {/* Collection Management */}
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-gray-700">Collection</label>
            </div>
            <div class="flex space-x-2">
              <select 
                class="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <option value="">
                  {isLoading ? 'Loading...' : collections.length > 0 ? 'Select a collection...' : 'No collections yet'}
                </option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setShowAddCollectionModal(true)}
                class="px-3 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md transition-colors"
                title="Create new collection"
              >
                +
              </button>
            </div>
            
            {/* Folder and Settings buttons */}
            <div class="flex space-x-2">
              <button 
                onClick={() => setShowAddFolderModal(true)}
                class={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedCollection 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!selectedCollection}
                title={selectedCollection ? 'Add folder to collection' : 'Select a collection first'}
              >
                Add Folder
              </button>
              <button 
                onClick={() => selectedCollection && setLocation(`/collections/${selectedCollection.id}`)}
                class={`px-3 py-2 rounded-md transition-colors ${
                  selectedCollection 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!selectedCollection}
                title={selectedCollection ? 'Collection settings' : 'Select a collection first'}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div>
            <div class="relative">
              <input 
                type="text" 
                placeholder="Filter requests..."
                value={searchTerm}
                onInput={(e) => setSearchTerm(e.target.value)}
                class={`w-full pl-8 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  selectedCollection ? '' : 'text-gray-500'
                }`}
                disabled={!selectedCollection}
              />
              
              {/* Clear search button */}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  class="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 hover:text-gray-600"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>

          {/* Folder Tree or Empty State */}
          {collections.length === 0 && !isLoading ? (
            <div class="text-center py-8 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p class="text-sm">No collections yet</p>
              <p class="text-xs mt-1">Import an OpenAPI spec to get started</p>
            </div>
          ) : selectedCollection ? (
            <div class="space-y-2">
              <h3 class="text-sm font-medium text-gray-700 px-2">
                {selectedCollection.name}
              </h3>
              <FolderTree searchTerm={searchTerm} />
            </div>
          ) : null}
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
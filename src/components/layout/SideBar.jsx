import { useState, useRef, useEffect } from 'preact/hooks';
import { Suspense, lazy } from 'preact/compat';
import { useLocation } from 'wouter-preact';
import { Settings, FolderPlus, Download, RefreshCw, Undo2, ChevronsUpDown, ChevronsDownUp } from 'lucide-preact';

// Dynamic imports for import modals - only loaded when needed
const OpenAPIImportModal = lazy(() => import('../import/OpenAPIImportModal').then(m => ({ default: m.OpenAPIImportModal })));
const PostmanImportModal = lazy(() => import('../import/PostmanImportModal').then(m => ({ default: m.PostmanImportModal })));
const URLImportModal = lazy(() => import('../import/URLImportModal').then(m => ({ default: m.URLImportModal })));
import { AddFolderModal } from '../modals/AddFolderModal';
import { AddCollectionModal } from '../modals/AddCollectionModal';
import { ExportPostmanModal } from '../modals/ExportPostmanModal';
import { ReImportModal } from '../modals/ReImportModal';
import { ContextMenu } from '../common/ContextMenu';
import { FolderTree } from '../sidebar/FolderTree';
import { TextInput } from '../common/TextInput';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { hasSessionKey } from '../../utils/encryption';
import { setLastSlingshotUrl } from '../../utils/slingshotNavigation';

export function SideBar({ onClose: _onClose }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPostmanImportModal, setShowPostmanImportModal] = useState(false);
  const [showURLImportModal, setShowURLImportModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [showExportPostmanModal, setShowExportPostmanModal] = useState(false);
  const [showReImportModal, setShowReImportModal] = useState(false);
  const [showImportContextMenu, setShowImportContextMenu] = useState(false);
  const [showCollectionContextMenu, setShowCollectionContextMenu] = useState(false);
  const importButtonRef = useRef();
  const collectionMenuTriggerRef = useRef();
  const lastInitCollectionRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setLocation] = useLocation();
  const { collections, selectedCollection, selectCollection, selectRequest, isLoading, updateCollection, addCollection, removeCollection, currentEnvironment, setCurrentEnvironment, hasManuallySelectedEnvironment, setHasManuallySelectedEnvironment } = useAppContext();

  // Environment state
  const [environments, setEnvironments] = useState([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);
  const [showDefaultSuccess, setShowDefaultSuccess] = useState(false);

  // Load environments when component mounts
  useEffect(() => {
    loadEnvironments();
  }, []);

  // Listen for global event to close collection context menu when other menus open
  useEffect(() => {
    const handleCloseAllContextMenus = (e) => {
      if (e.detail.exceptId !== 'collection-menu') {
        setShowCollectionContextMenu(false);
      }
    };

    window.addEventListener('closeAllContextMenus', handleCloseAllContextMenus);
    return () => {
      window.removeEventListener('closeAllContextMenus', handleCloseAllContextMenus);
    };
  }, []);

  // Update current environment when selectedCollection changes, but respect manual selection
  useEffect(() => {
    if (!selectedCollection) {
      lastInitCollectionRef.current = null;
      setCurrentEnvironment(null);
      setHasManuallySelectedEnvironment(false);
      return;
    }

    const collectionChanged = lastInitCollectionRef.current !== selectedCollection.id;

    // Skip if same collection and user already manually picked an environment
    if (!collectionChanged && hasManuallySelectedEnvironment) return;

    lastInitCollectionRef.current = selectedCollection.id;

    // Check localStorage for a previously selected environment for this collection
    try {
      const stored = localStorage.getItem('slingshot_draft_env');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.col === selectedCollection.id) {
          if (parsed.env === 'none') {
            setCurrentEnvironment(null);
            setHasManuallySelectedEnvironment(true);
            return;
          }
          if (environments.length > 0) {
            const storedEnv = environments.find(env => env.id === parsed.env);
            if (storedEnv) {
              setCurrentEnvironment(storedEnv);
              setHasManuallySelectedEnvironment(true);
              return;
            }
          }
        }
      }
    } catch (e) {
      // ignore malformed localStorage value
    }

    // Fall back to collection default environment
    if (selectedCollection.environment_id && environments.length > 0) {
      const environment = environments.find(env => env.id === selectedCollection.environment_id);
      setCurrentEnvironment(environment || null);
    } else {
      setCurrentEnvironment(null);
    }
    setHasManuallySelectedEnvironment(false);
  }, [selectedCollection, environments, hasManuallySelectedEnvironment, setCurrentEnvironment, setHasManuallySelectedEnvironment]);

  const loadEnvironments = async () => {
    // Only load environments if encryption key is available
    if (!(await hasSessionKey())) {
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
    setHasManuallySelectedEnvironment(true); // Mark that user manually selected an environment
    if (environmentId === 'none') {
      setCurrentEnvironment(null);
    } else {
      const environment = environments.find(env => env.id === environmentId);
      setCurrentEnvironment(environment || null);
    }
    // Persist selection so it survives full-page reloads
    if (selectedCollection) {
      localStorage.setItem('slingshot_draft_env', JSON.stringify({ env: environmentId, col: selectedCollection.id }));
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

  // True when the user has a draft env override that differs from the collection's saved default
  const hasDraftEnvOverride = selectedCollection && hasManuallySelectedEnvironment && !isDefaultEnvironment;

  const handleResetDraftEnv = () => {
    localStorage.removeItem('slingshot_draft_env');
    setHasManuallySelectedEnvironment(false);
    // The useEffect will re-run and restore the collection default
  };

  const handleCollectionContextMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Close any other open context menus
    window.dispatchEvent(new CustomEvent('closeAllContextMenus', { detail: { exceptId: 'collection-menu' } }));

    setShowCollectionContextMenu(true);
  };

  return (
    <>
      {/* Sidebar */}
      <aside class="bg-white dark:bg-[#313340] rounded-lg md:border border-gray-300 dark:border-neutral-dark-50 h-full flex flex-col">
        <div class="flex flex-1 flex-col gap-y-5 overflow-y-auto scrollbar-hide p-4">
          <nav class="flex flex-1 flex-col space-y-4">
            {/* Import Button with Dropdown */}
            <div class="relative">
              <button
                ref={importButtonRef}
                onClick={() => setShowImportContextMenu(true)}
                class="w-full justify-between rounded-md bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 py-2 px-3 text-sm font-medium text-sky-700 dark:text-primary-dark-400 flex items-center cursor-pointer"
              >
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                    <path d="M9 15h6"/>
                    <path d="M12 18v-6"/>
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
                <label for="collection-select" class="block text-xs font-medium text-gray-600 dark:text-neutral-dark-600">Collection</label>
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
                  class="w-full appearance-none rounded-md bg-white dark:bg-[#313340] py-2 pl-3 pr-8 text-sm text-gray-900 dark:text-neutral-dark-900 outline -outline-offset-1 outline-gray-300 dark:outline-neutral-dark-50 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
                  value={selectedCollection?.id || ''}
                  onChange={(e) => {
                    const collectionId = e.target.value;
                    if (collectionId) {
                      const collection = collections.find(c => c.id === collectionId);
                      if (collection) {
                        selectCollection(collection);
                        const url = `/${collectionId}`;
                        setLastSlingshotUrl(url);
                        setLocation(url);
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
                <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 dark:text-neutral-dark-500 h-4 w-4"
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
                      class="justify-center rounded-md bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 h-[30px] w-[30px] text-sm font-medium text-sky-700 dark:text-primary-dark-400 flex items-center p-0 cursor-pointer no-underline"
                      title="Collection settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </a>
                    <button
                      onClick={() => setShowAddFolderModal(true)}
                      class="justify-center rounded-md bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 h-[30px] w-[30px] text-sm font-medium text-sky-700 dark:text-primary-dark-400 flex items-center p-0 cursor-pointer"
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
                      class="justify-center rounded-md bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 h-[30px] w-[30px] text-sm font-medium text-sky-700 dark:text-primary-dark-400 flex items-center p-0 cursor-pointer"
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
                  <label for="environment-select" class="block text-xs font-medium text-gray-600 dark:text-neutral-dark-600">Environment</label>
                  {hasDraftEnvOverride && (
                    <button
                      onClick={handleResetDraftEnv}
                      class="text-xs text-sky-600 hover:text-sky-800 focus:outline-none cursor-pointer flex items-center"
                      title="Reset draft env. to collection setting."
                    >
                      <Undo2 size={12} />
                    </button>
                  )}
                </div>
                <div class="relative">
                  <select
                    id="environment-select"
                    class="w-full appearance-none rounded-md bg-white dark:bg-[#313340] py-2 pl-3 pr-8 text-sm text-gray-900 dark:text-neutral-dark-900 outline -outline-offset-1 outline-gray-300 dark:outline-neutral-dark-50 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
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
                  <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 dark:text-neutral-dark-500 h-4 w-4"
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
                      ? 'bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400 cursor-pointer'
                      : 'bg-gray-100 dark:bg-neutral-dark-200 text-gray-400 dark:text-neutral-dark-400 cursor-not-allowed'
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
                      ? 'bg-green-100 dark:bg-success-dark-100 text-green-700 dark:text-success-dark-400'
                      : isDefaultEnvironment && !showDefaultSuccess
                        ? 'bg-sky-100 dark:bg-primary-dark-200 text-sky-700 dark:text-primary-dark-400 cursor-default'
                        : !isUpdatingDefault
                          ? 'bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400'
                          : 'bg-gray-100 dark:bg-neutral-dark-200 text-gray-400 dark:text-neutral-dark-400 cursor-not-allowed'
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
                <div class="mb-3 px-2 py-1 rounded-md text-xs bg-gray-100 dark:bg-neutral-dark-200 text-gray-500 dark:text-neutral-dark-500 flex items-center">
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
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-dark-600">Requests</label>
                {selectedCollection && (
                  <div class="flex items-center gap-1">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('expandAllFolders'))}
                      class="text-xs text-sky-600 hover:text-sky-800 focus:outline-none cursor-pointer"
                      title="Expand all folders"
                    >
                      <ChevronsUpDown size={14} />
                    </button>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('collapseAllFolders'))}
                      class="text-xs text-sky-600 hover:text-sky-800 focus:outline-none cursor-pointer"
                      title="Collapse all folders"
                    >
                      <ChevronsDownUp size={14} />
                    </button>
                    <a
                      href={selectedCollection ? `/${selectedCollection.id}` : '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        selectRequest(null); // Clear request editor fields
                        const url = `/${selectedCollection.id}`;
                        setLastSlingshotUrl(url);
                        setLocation(url);
                      }}
                      class="text-xs text-sky-600 hover:text-sky-800 focus:outline-none cursor-pointer"
                    >
                      Add
                    </a>
                  </div>
                )}
              </div>

              {/* Filter input */}
              <div class="relative mb-2">
                <TextInput
                  placeholder="Filter requests..."
                  value={searchTerm}
                  onInput={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedCollection}
                  style={{ fontSize: '0.75rem', paddingLeft: '1.75rem', paddingRight: '2rem' }}
                />
                <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 dark:text-neutral-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    class="absolute inset-y-0 right-0 pr-1 flex items-center text-gray-400 hover:text-gray-600 dark:text-neutral-dark-400 dark:hover:text-neutral-dark-600 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div class="mt-4 overflow-y-auto overflow-x-visible relative">
                {/* Collection link */}
                {selectedCollection && (
                  <div class="flex items-center px-1 group hover:bg-gray-100 dark:hover:bg-neutral-dark-200 rounded">
                    <a
                      href={`/${selectedCollection.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        selectRequest(null);
                        const url = `/${selectedCollection.id}`;
                        setLastSlingshotUrl(url);
                        setLocation(url);
                      }}
                      class="flex-1 flex items-center py-1 text-xs font-medium cursor-pointer no-underline text-gray-600 dark:text-neutral-dark-600"
                    >
                      <span class="truncate font-medium">{selectedCollection.name}</span>
                    </a>
                    <button
                      ref={collectionMenuTriggerRef}
                      onClick={handleCollectionContextMenuClick}
                      class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer"
                      title="More options"
                    >
                      <span class="sr-only">Open collection options</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="flex-shrink-0">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                  </div>
                )}
                <FolderTree searchTerm={searchTerm} />
              </div>
            </div>

          </nav>
        </div>
      </aside>

      {/* OpenAPI Import Modal */}
      {showImportModal && (
        <Suspense fallback={null}>
          <OpenAPIImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={(collection) => {
              console.log('Collection imported successfully:', collection);
            }}
          />
        </Suspense>
      )}

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
      {showPostmanImportModal && (
        <Suspense fallback={null}>
          <PostmanImportModal
            isOpen={showPostmanImportModal}
            onClose={() => setShowPostmanImportModal(false)}
            onSuccess={(collection) => {
              console.log('Postman collection imported successfully:', collection);
            }}
          />
        </Suspense>
      )}

      {/* URL Import Modal */}
      {showURLImportModal && (
        <Suspense fallback={null}>
          <URLImportModal
            isOpen={showURLImportModal}
            importUrl=""
            onClose={() => setShowURLImportModal(false)}
            onSuccess={(collection) => {
              console.log('URL imported successfully:', collection);
            }}
          />
        </Suspense>
      )}

      {/* Import Context Menu */}
      <ContextMenu
        isOpen={showImportContextMenu}
        onClose={() => setShowImportContextMenu(false)}
        trigger={importButtonRef.current}
        width={200}
        position="below"
        items={[
          {
            label: 'Link...',
            onClick: () => {
              setShowImportContextMenu(false);
              setShowURLImportModal(true);
            },
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-symlink-icon lucide-file-symlink">
                <path d="m10 18 3-3-3-3" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M4 11V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7" />
              </svg>
            )
          },
          {
            label: 'OpenAPI spec...',
            onClick: () => {
              setShowImportContextMenu(false);
              setShowImportModal(true);
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
            label: 'Postman collection...',
            onClick: () => {
              setShowImportContextMenu(false);
              setShowPostmanImportModal(true);
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

      {/* Collection Context Menu */}
      <ContextMenu
        isOpen={showCollectionContextMenu}
        onClose={() => setShowCollectionContextMenu(false)}
        trigger={collectionMenuTriggerRef.current}
        width={200}
        position="right"
        items={[
          {
            label: 'Settings',
            onClick: () => {
              setShowCollectionContextMenu(false);
              setLocation(`/collections/${selectedCollection.id}`);
            },
            icon: <Settings size={16} />
          },
          { divider: true },
          {
            label: 'Add folder...',
            onClick: () => {
              setShowCollectionContextMenu(false);
              setShowAddFolderModal(true);
            },
            icon: <FolderPlus size={16} />
          },
          { divider: true },
          {
            label: 'Re-Import...',
            onClick: () => {
              setShowCollectionContextMenu(false);
              setShowReImportModal(true);
            },
            icon: <RefreshCw size={16} />
          },
          {
            label: 'Export...',
            onClick: () => {
              setShowCollectionContextMenu(false);
              setShowExportPostmanModal(true);
            },
            icon: <Download size={16} />
          }
        ]}
      />

      {/* Re-Import Modal */}
      <ReImportModal
        isOpen={showReImportModal}
        collection={selectedCollection}
        onClose={() => setShowReImportModal(false)}
        onSuccess={(collection) => {
          console.log('Collection re-imported successfully:', collection);
        }}
      />
    </>
  );
}

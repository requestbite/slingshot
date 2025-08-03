import { useState, useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { AddEnvironmentModal } from '../components/modals/AddEnvironmentModal';
import { DeleteEnvironmentModal } from '../components/modals/DeleteEnvironmentModal';
import { ContextMenu } from '../components/common/ContextMenu';
import { Toast, useToast } from '../components/common/Toast';
import { useAppContext } from '../hooks/useAppContext';
import { apiClient } from '../api';
import { setupEncryptionKey, hasSessionKey, storeEncryptedReference } from '../utils/encryption';

export function EnvironmentsPage() {
  const [, setLocation] = useLocation();
  const { loadCollections } = useAppContext();
  const [environmentsWithCounts, setEnvironmentsWithCounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuTrigger, setContextMenuTrigger] = useState(null);
  const [contextMenuEnvironment, setContextMenuEnvironment] = useState(null);
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');

  // Encryption key setup state (for first-time setup)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const passwordInputRef = useRef();

  useEffect(() => {
    loadEnvironmentsWithCounts();
  }, []);

  const loadEnvironmentsWithCounts = async () => {
    try {
      setIsLoading(true);

      // Load environments directly
      const allEnvironments = await apiClient.getAllEnvironments();

      const environmentsData = await Promise.all(
        allEnvironments.map(async (environment) => {
          try {
            // Get collection count
            const collections = await apiClient.getCollectionsByEnvironment(environment.id);
            const collectionCount = collections.length;

            // Get environment secret count
            const secretCount = await apiClient.countEnvironmentSecrets(environment.id);

            return {
              ...environment,
              collection_count: collectionCount,
              secret_count: secretCount
            };
          } catch (error) {
            console.error(`Error loading counts for environment ${environment.id}:`, error);
            return {
              ...environment,
              collection_count: 0,
              secret_count: 0
            };
          }
        })
      );

      // Sort by name
      environmentsData.sort((a, b) => a.name.localeCompare(b.name));
      setEnvironmentsWithCounts(environmentsData);

    } catch (error) {
      console.error('Failed to load environments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEnvironment = (environment = null) => {
    const targetEnvironment = environment || contextMenuEnvironment;
    if (targetEnvironment) {
      setLocation(`/environments/${targetEnvironment.id}`);
    }
  };

  const handleDeleteEnvironment = () => {
    if (contextMenuEnvironment) {
      setSelectedEnvironment(contextMenuEnvironment);
      setShowDeleteModal(true);
    }
  };

  const handleContextMenuOpen = (e, environment) => {
    e.stopPropagation();
    setContextMenuTrigger(e.currentTarget);
    setContextMenuEnvironment(environment);
    setContextMenuOpen(true);
  };

  const handleContextMenuClose = () => {
    setContextMenuOpen(false);
    setContextMenuTrigger(null);
    setContextMenuEnvironment(null);
  };

  const handleDeleteSuccess = async () => {
    await loadEnvironmentsWithCounts();
    await loadCollections(); // Refresh collections since they may reference deleted environment
    setToastMessage('Environment deleted successfully');
    showToast();
  };

  const handleCreateSuccess = async (environment) => {
    await loadEnvironmentsWithCounts();
    setToastMessage('Environment created successfully');
    showToast();
  };

  const showNotification = (message) => {
    setToastMessage(message);
    showToast();
  };

  const copyToClipboard = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification(message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleEncryptionKeySubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { key, salt } = await setupEncryptionKey(password);
      // Store encrypted reference for password verification
      await storeEncryptedReference(password, salt);
      
      setToastMessage('Encryption key setup successfully');
      showToast();
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to setup encryption key:', error);
      setError('Failed to setup encryption key. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-focus on password input when no encryption key is available
  useEffect(() => {
    if (!isLoading && !hasSessionKey() && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current.focus();
      }, 100);
    }
  }, [isLoading]);

  // Show encryption key setup form if no session key exists
  if (!isLoading && !hasSessionKey()) {
    return (
      <div class="h-full bg-gray-100 overflow-y-auto">
        <div class="min-h-full pt-[83px] pb-6 flex items-center justify-center">
          <div class="w-full max-w-lg px-4">
            <div class="bg-white rounded-lg border border-gray-300 p-6">
              <form onSubmit={handleEncryptionKeySubmit}>
                <div class="text-left">
                  <h3 class="text-base font-semibold text-gray-900">Set encryption key</h3>
                  <div class="mt-2 text-sm text-gray-500">
                    Environments are used to store encrypted secrets such as passwords. To support this, you need to provide a password that can be used to decrypt your environment secrets. When you have active environments, you will be asked to provide this secret whenever you load the Slingshot app.
                  </div>

                  {error && (
                    <div class="mt-4 text-sm text-red-600 bg-red-100 p-2 rounded-md">
                      {error}
                    </div>
                  )}

                  <div class="mt-6">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      ref={passwordInputRef}
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    <p class="mt-1 text-xs text-gray-500">Must be at least 4 characters long.</p>
                  </div>

                  <div class="mt-4">
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Repeat password</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      class="block w-full rounded-md px-3 py-1.5 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm/6"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div class="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting || !password.trim() || !confirmPassword.trim() || password !== confirmPassword || password.length < 4}
                      class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:bg-sky-300 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmitting ? 'Setting up...' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <Toast
          message={toastMessage}
          isVisible={isToastVisible}
          onClose={hideToast}
          type="success"
        />
      </div>
    );
  }

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        {/* Main Container */}
        <div class="max-w-4xl mx-auto px-4">
          <div class="bg-white rounded-lg border border-gray-300">
            {/* Header Section */}
            <div class="sm:flex sm:items-start p-6">
              <div class="sm:flex-auto">
                <h1 class="text-base/7 font-semibold text-gray-900">
                  Environments
                </h1>
                <p class="mt-1 text-sm/6 text-gray-600">
                  Manage your environments and their encrypted secrets.
                </p>
              </div>
              <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                <button
                  onClick={() => setShowAddModal(true)}
                  type="button"
                  class="cursor-pointer block rounded-md bg-sky-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-sky-400 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                >
                  Add Environment
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
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading environments...</span>
                  </div>
                </div>
              ) : environmentsWithCounts.length === 0 ? (
                <p class="px-6 sm:p-0">No environments found.</p>
              ) : (
                <table class="w-full table-fixed divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th scope="col" class="w-auto py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        <div class="truncate">Name</div>
                      </th>
                      <th scope="col" class="hidden sm:table-cell w-26 py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        <div class="truncate">Collections</div>
                      </th>
                      <th scope="col" class="hidden sm:table-cell w-26 py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                        <div class="truncate">Secrets</div>
                      </th>
                      <th scope="col" class="table-cell w-20 pl-3 pr-6 py-3.5 sm:pr-0 text-right text-sm font-semibold text-gray-900">
                        <div>Actions</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    {environmentsWithCounts.map((environment) => (
                      <tr key={environment.id}>
                        <td class="py-4 pl-6 pr-3 text-sm sm:pl-0">
                          <div class="truncate">
                            <a href="#" onClick={(e) => { e.preventDefault(); handleEditEnvironment(environment); }} class="text-sky-500 hover:text-sky-700 hover:underline block truncate">
                              {environment.name}
                            </a>
                          </div>
                        </td>
                        <td class="hidden sm:table-cell py-4 pl-6 pr-3 text-sm sm:pl-0">
                          <div class="truncate">
                            {environment.collection_count}
                          </div>
                        </td>
                        <td class="hidden sm:table-cell py-4 pl-6 pr-3 text-sm sm:pl-0">
                          <div class="truncate">
                            {environment.secret_count}
                          </div>
                        </td>
                        <td class="table-cell py-4 pl-3 pr-6 text-right text-sm sm:pr-0">
                          <div class="flex justify-end">
                            <button
                              onClick={(e) => handleContextMenuOpen(e, environment)}
                              type="button"
                              class="cursor-pointer inline-flex items-center text-sky-500 hover:text-sky-700 hover:underline flex-shrink-0"
                              id={`environment-menu-button-${environment.id}`}
                              aria-expanded="false"
                              aria-haspopup="true"
                            >
                              <span class="sr-only">Open options menu for {environment.name}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenuOpen}
        onClose={handleContextMenuClose}
        trigger={contextMenuTrigger}
        items={[
          {
            label: 'Edit environment',
            onClick: () => handleEditEnvironment()
          },
          {
            label: 'Delete environment ...',
            onClick: handleDeleteEnvironment
          }
        ]}
      />

      {/* Add Environment Modal */}
      <AddEnvironmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Environment Modal */}
      <DeleteEnvironmentModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        environment={selectedEnvironment}
        onDelete={handleDeleteSuccess}
      />
    </div>
  );
}
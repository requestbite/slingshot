import { useState, useEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'wouter-preact';
import { DeleteCollectionModal } from '../components/modals/DeleteCollectionModal';
import { apiClient } from '../api';
import { useAppContext } from '../hooks/useAppContext';

export function CollectionUpdatePage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/collections/:uuid');
  const { loadCollections } = useAppContext();

  const [collection, setCollection] = useState(null);
  const [originalVariables, setOriginalVariables] = useState([]);
  const [pendingVariables, setPendingVariables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    follow_redirects: true,
    timeout: 30,
    parse_ansi_colors: true
  });

  // Variable form state
  const [variableForm, setVariableForm] = useState({
    key: '',
    value: ''
  });

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);

  // Modal states
  const [editVariableModal, setEditVariableModal] = useState(false);
  const [deleteCollectionModal, setDeleteCollectionModal] = useState(false);
  const [deleteVariableModal, setDeleteVariableModal] = useState(false);

  // Edit variable state
  const [editingVariable, setEditingVariable] = useState({
    id: null,
    key: '',
    value: ''
  });

  // Delete variable state
  const [variableToDelete, setVariableToDelete] = useState(null);

  useEffect(() => {
    if (match && params.uuid) {
      loadCollectionData(params.uuid);
    }
  }, [match, params.uuid]);

  const loadCollectionData = async (collectionId) => {
    try {
      setIsLoading(true);

      const collectionData = await apiClient.getCollection(collectionId);
      if (!collectionData) {
        setNotification('Collection not found');
        setLocation('/collections');
        return;
      }

      setCollection(collectionData);
      setFormData({
        name: collectionData.name,
        description: collectionData.description || '',
        follow_redirects: collectionData.follow_redirects !== undefined ? collectionData.follow_redirects : true,
        timeout: collectionData.timeout !== undefined ? collectionData.timeout : 30,
        parse_ansi_colors: collectionData.parse_ansi_colors !== undefined ? collectionData.parse_ansi_colors : true
      });

      const variablesData = await apiClient.getSecretsByCollection(collectionId);
      const sortedVariables = variablesData.sort((a, b) => a.key.localeCompare(b.key));
      setOriginalVariables(sortedVariables);
      setPendingVariables(sortedVariables.map(s => ({ ...s, _status: 'existing' })));

    } catch (error) {
      console.error('Failed to load collection:', error);
      setNotification('Failed to load collection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setNotification('Collection name is required');
      return;
    }

    try {
      // Update collection details
      await apiClient.updateCollection(collection.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        follow_redirects: formData.follow_redirects,
        timeout: formData.timeout,
        parse_ansi_colors: formData.parse_ansi_colors
      });

      // Process variable changes
      for (const variable of pendingVariables) {
        if (variable._status === 'new') {
          await apiClient.createSecret({
            collection_id: collection.id,
            key: variable.key,
            value: variable.value
          });
        } else if (variable._status === 'updated') {
          await apiClient.updateSecret(variable.id, {
            key: variable.key,
            value: variable.value
          });
        }
      }

      // Delete removed variables
      const currentVariableIds = new Set(pendingVariables.map(s => s.id).filter(id => id && !id.startsWith('temp_')));
      const originalVariableIds = new Set(originalVariables.map(s => s.id));

      for (const originalId of originalVariableIds) {
        if (!currentVariableIds.has(originalId)) {
          await apiClient.deleteSecret(originalId);
        }
      }

      await loadCollections();
      setNotification('Collection updated successfully');
      setLocation('/collections');
    } catch (error) {
      console.error('Failed to update collection:', error);
      setNotification('Failed to update collection');
    }
  };

  const handleAddVariable = (e) => {
    e.preventDefault();

    if (!variableForm.key.trim() || !variableForm.value.trim()) {
      setNotification('Both key and value are required');
      return;
    }

    // Check for duplicate keys
    const existingKey = pendingVariables.find(s => s.key === variableForm.key.trim());
    if (existingKey) {
      setNotification('A variable with this key already exists');
      return;
    }

    const newVariable = {
      id: `temp_${Date.now()}`,
      key: variableForm.key.trim(),
      value: variableForm.value.trim(),
      _status: 'new'
    };

    setPendingVariables([...pendingVariables, newVariable].sort((a, b) => a.key.localeCompare(b.key)));
    setVariableForm({ key: '', value: '' });
    setHasChanges(true);
  };

  const handleEditVariable = (variable) => {
    setEditingVariable({
      id: variable.id,
      key: variable.key,
      value: variable.value
    });
    setEditVariableModal(true);
  };

  const handleUpdateVariable = (e) => {
    e.preventDefault();

    if (!editingVariable.key.trim() || !editingVariable.value.trim()) {
      setNotification('Both key and value are required');
      return;
    }

    // Check for duplicate keys (excluding the current variable)
    const existingKey = pendingVariables.find(s => s.key === editingVariable.key.trim() && s.id !== editingVariable.id);
    if (existingKey) {
      setNotification('A variable with this key already exists');
      return;
    }

    const updatedVariables = pendingVariables.map(s => {
      if (s.id === editingVariable.id) {
        return {
          ...s,
          key: editingVariable.key.trim(),
          value: editingVariable.value.trim(),
          _status: s._status === 'new' ? 'new' : 'updated'
        };
      }
      return s;
    });

    setPendingVariables(updatedVariables.sort((a, b) => a.key.localeCompare(b.key)));
    setEditVariableModal(false);
    setHasChanges(true);
  };

  const handleDeleteVariable = () => {
    if (!variableToDelete) return;

    const updatedVariables = pendingVariables.filter(s => s.id !== variableToDelete);
    setPendingVariables(updatedVariables);
    setDeleteVariableModal(false);
    setVariableToDelete(null);
    setHasChanges(true);
  };

  const handleDeleteSuccess = async () => {
    setNotification('Collection deleted successfully');
    setLocation('/collections');
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocation('/collections');
      }
    } else {
      setLocation('/collections');
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  if (isLoading) {
    return (
      <div class="h-full flex items-center justify-center">
        <div class="flex items-center space-x-3 text-gray-500">
          <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading collection...</span>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <h2 class="text-lg font-medium text-gray-900">Collection not found</h2>
          <p class="text-gray-600 mt-2">The collection you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        <div class="max-w-4xl mx-auto px-4">
          <div class="bg-white rounded-lg border border-gray-300 p-6">

            {/* Collection Form */}
            <form onSubmit={handleFormSubmit} class="border-b border-gray-900/10 pb-6">
              <div class="space-y-8">
                <div class="border-b border-gray-900/10 pb-12">
                  <h2 class="text-base font-semibold text-gray-900">Update Collection</h2>
                  <p class="mt-1 text-sm text-gray-600">Manage your collection details.</p>

                  <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                    <div class="sm:col-span-4">
                      <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onInput={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          setHasChanges(true);
                        }}
                        class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                        required
                      />
                    </div>

                    <div class="sm:col-span-6">
                      <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        id="description"
                        rows="3"
                        value={formData.description}
                        onInput={(e) => {
                          setFormData({ ...formData, description: e.target.value });
                          setHasChanges(true);
                        }}
                        class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                      />
                    </div>

                    {/* Settings Section */}
                    <div class="sm:col-span-6">
                      <h3 class="text-base font-semibold text-gray-900 mb-4">Request Settings</h3>
                      <div class="space-y-4">
                        {/* Automatically follow redirects setting */}
                        <div class="flex items-center">
                          <input
                            type="checkbox"
                            id="follow-redirects-checkbox"
                            checked={formData.follow_redirects}
                            onChange={(e) => {
                              setFormData({ ...formData, follow_redirects: e.target.checked });
                              setHasChanges(true);
                            }}
                            class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                          />
                          <label for="follow-redirects-checkbox" class="ml-2 block text-sm text-gray-900">
                            Automatically follow redirects
                          </label>
                        </div>

                        {/* Request timeout setting */}
                        <div class="flex items-center">
                          <label for="request-timeout-input" class="block text-sm text-gray-900 mr-3">
                            Request timeout (seconds):
                          </label>
                          <input
                            type="number"
                            id="request-timeout-input"
                            value={formData.timeout}
                            min="1"
                            max="300"
                            onChange={(e) => {
                              const numValue = parseInt(e.target.value, 10);
                              if (numValue >= 1 && numValue <= 300) {
                                setFormData({ ...formData, timeout: numValue });
                                setHasChanges(true);
                              }
                            }}
                            class="w-24 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <span class="ml-2 text-xs text-gray-500">(1-300 seconds)</span>
                        </div>

                        {/* Parse ANSI colors setting */}
                        <div class="flex items-center">
                          <input
                            type="checkbox"
                            id="parse-ansi-colors-checkbox"
                            checked={formData.parse_ansi_colors}
                            onChange={(e) => {
                              setFormData({ ...formData, parse_ansi_colors: e.target.checked });
                              setHasChanges(true);
                            }}
                            class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                          />
                          <label for="parse-ansi-colors-checkbox" class="ml-2 block text-sm text-gray-900">
                            Parse ANSI color codes in text/plain responses
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Variables Section */}
            <div class="mt-8">
              <h2 class="text-base font-semibold text-gray-900">Variables</h2>
              <p class="mt-1 mb-4 text-sm text-gray-600">Variables can be used throughout your collection requests.</p>

              {/* Add new variable form */}
              <div class="mb-6">
                <form onSubmit={handleAddVariable} class="m-0 p-0">
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label for="variable_key" class="block text-sm font-medium text-gray-700">Key</label>
                      <input
                        type="text"
                        id="variable_key"
                        value={variableForm.key}
                        onInput={(e) => setVariableForm({ ...variableForm, key: e.target.value })}
                        class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                        placeholder="apiKey"
                      />
                    </div>
                    <div>
                      <label for="variable_value" class="block text-sm font-medium text-gray-700">Value</label>
                      <div class="flex mt-1">
                        <input
                          type="text"
                          id="variable_value"
                          value={variableForm.value}
                          onInput={(e) => setVariableForm({ ...variableForm, value: e.target.value })}
                          class="block w-full rounded-l-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                          placeholder="your-variable-value"
                        />
                        <button
                          type="submit"
                          class="rounded-r-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Existing variables list */}
              <div class="overflow-hidden border border-gray-300 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Key</th>
                      <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Value</th>
                      <th class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 bg-white">
                    {pendingVariables.length > 0 ? (
                      pendingVariables.map((variable) => (
                        <tr key={variable.id} class={variable._status === 'new' ? 'bg-blue-50' : variable._status === 'updated' ? 'bg-yellow-50' : ''}>
                          <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {variable.key}
                            {variable._status === 'new' && <span class="ml-2 text-xs text-blue-600">(new)</span>}
                            {variable._status === 'updated' && <span class="ml-2 text-xs text-yellow-600">(modified)</span>}
                          </td>
                          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {variable.value}
                          </td>
                          <td class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditVariable(variable)}
                              class="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-medium rounded-md cursor-pointer inline-block"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVariableToDelete(variable.id);
                                setDeleteVariableModal(true);
                              }}
                              class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md cursor-pointer inline-block"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colspan="3" class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                          No variables added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div class="mt-6 flex items-center justify-between">
              <div class="flex items-center gap-x-3">
                <button
                  onClick={handleFormSubmit}
                  type="button"
                  class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  class="cursor-pointer rounded-md bg-white hover:bg-gray-50 px-3 py-2 text-sm border border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                >
                  Cancel
                </button>
              </div>
              <div>
                <button
                  onClick={() => setDeleteCollectionModal(true)}
                  type="button"
                  class="cursor-pointer rounded-md bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Delete Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Variable Modal */}
      {editVariableModal && (
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
          <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
              <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6">
                <form onSubmit={handleUpdateVariable}>
                  <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      onClick={() => setEditVariableModal(false)}
                      type="button"
                      class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                    >
                      <span class="sr-only">Close</span>
                      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div class="mt-0 sm:text-left">
                    <h3 class="text-base font-semibold text-gray-900">Edit Variable</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">Update your collection variable.</p>
                    </div>
                    <div class="mt-6">
                      <label for="edit_variable_key" class="block text-sm font-medium text-gray-700">Key</label>
                      <input
                        type="text"
                        id="edit_variable_key"
                        value={editingVariable.key}
                        onInput={(e) => setEditingVariable({ ...editingVariable, key: e.target.value })}
                        class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                      />
                    </div>
                    <div class="mt-6">
                      <label for="edit_variable_value" class="block text-sm font-medium text-gray-700">Value</label>
                      <input
                        type="text"
                        id="edit_variable_value"
                        value={editingVariable.value}
                        onInput={(e) => setEditingVariable({ ...editingVariable, value: e.target.value })}
                        class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                      />
                    </div>
                  </div>
                  <div class="mt-8 flex justify-end">
                    <button
                      onClick={() => setEditVariableModal(false)}
                      type="button"
                      class="mr-3 inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class="inline-flex justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Collection Modal */}
      <DeleteCollectionModal
        isOpen={deleteCollectionModal}
        onClose={() => setDeleteCollectionModal(false)}
        collection={collection}
        onDelete={handleDeleteSuccess}
      />

      {/* Delete Variable Modal */}
      {deleteVariableModal && (
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
          <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
              <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    onClick={() => setDeleteVariableModal(false)}
                    type="button"
                    class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                  >
                    <span class="sr-only">Close</span>
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex w-12 h-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:w-10 sm:h-10">
                    <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 class="text-base font-semibold text-gray-900">Delete Variable</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">
                        Are you sure you want to delete this variable? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleDeleteVariable}
                    type="button"
                    class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 sm:ml-3 sm:w-auto cursor-pointer"
                  >
                    Delete Variable
                  </button>
                  <button
                    onClick={() => setDeleteVariableModal(false)}
                    type="button"
                    class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
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
    </div>
  );
}

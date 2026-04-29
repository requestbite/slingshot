import { useState, useEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'wouter-preact';
import { DeleteEnvironmentModal } from '../components/modals/DeleteEnvironmentModal';
import { Toast, useToast } from '../components/common/Toast';
import { AuthSection } from '../components/auth/AuthSection';
import { apiClient } from '../api';
import { decryptSecret } from '../utils/encryption';
import { TextInput } from '../components/common/TextInput';
import { Label } from '../components/common/Label';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

// Helper function to decrypt auth configuration  
const decryptAuthConfig = async (encryptedConfig) => {
  if (!encryptedConfig || !encryptedConfig.encrypted_value) return null;

  try {
    const decryptedString = await decryptSecret(encryptedConfig.encrypted_value, encryptedConfig.iv);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Failed to decrypt auth config:', error);
    return null;
  }
};

// Helper function to decrypt auth response
const decryptAuthResponse = async (encryptedResponse) => {
  if (!encryptedResponse || !encryptedResponse.encrypted_value) return null;

  try {
    const decryptedString = await decryptSecret(encryptedResponse.encrypted_value, encryptedResponse.iv);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Failed to decrypt auth response:', error);
    return null;
  }
};

export function EnvironmentUpdatePage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/environments/:uuid/:section?');

  const [environment, setEnvironment] = useState(null);
  const [originalSecrets, setOriginalSecrets] = useState([]);
  const [pendingSecrets, setPendingSecrets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Secret form state
  const [secretForm, setSecretForm] = useState({
    key: '',
    value: ''
  });

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);
  const [hasGeneralChanges, setHasGeneralChanges] = useState(false);
  const [hasSecretsChanges, setHasSecretsChanges] = useState(false);

  // Active section state - determine from URL
  const getInitialSection = () => {
    if (params.section === 'secrets') return 'secrets';
    if (params.section === 'auth') return 'auth';
    return 'general';
  };
  const [activeSection, setActiveSection] = useState(getInitialSection());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal states
  const [editSecretModal, setEditSecretModal] = useState(false);
  const [deleteEnvironmentModal, setDeleteEnvironmentModal] = useState(false);
  const [deleteSecretModal, setDeleteSecretModal] = useState(false);

  // Edit secret state
  const [editingSecret, setEditingSecret] = useState({
    _tempId: null,
    key: '',
    value: ''
  });

  // Delete secret state
  const [secretToDelete, setSecretToDelete] = useState(null);

  useEffect(() => {
    if (match && params.uuid) {
      loadEnvironmentData(params.uuid);
    }
  }, [match, params.uuid]);

  // Update active section when URL changes
  useEffect(() => {
    const newSection = params.section === 'secrets' ? 'secrets' :
      params.section === 'auth' ? 'auth' : 'general';
    setActiveSection(newSection);
  }, [params.section]);

  const loadEnvironmentData = async (environmentId) => {
    try {
      setIsLoading(true);

      const environmentData = await apiClient.getEnvironment(environmentId);
      if (!environmentData) {
        setToastMessage('Environment not found');
        setToastType('error');
        showToast();
        setLocation('/environments');
        return;
      }

      // Decrypt auth fields if they exist and are encrypted
      let decryptedEnvironment = { ...environmentData };

      try {
        if (environmentData.authConfig?.encrypted_value) {
          const decryptedAuthConfig = await decryptAuthConfig(environmentData.authConfig);
          if (decryptedAuthConfig) {
            decryptedEnvironment.authConfig = decryptedAuthConfig;
          }
        }

        if (environmentData.authResponse?.encrypted_value) {
          const decryptedAuthResponse = await decryptAuthResponse(environmentData.authResponse);
          if (decryptedAuthResponse) {
            decryptedEnvironment.authResponse = decryptedAuthResponse;
          }
        }
      } catch (error) {
        console.error('Failed to decrypt auth fields:', error);
        // Continue with encrypted data if decryption fails
      }

      setEnvironment(decryptedEnvironment);
      setFormData({
        name: decryptedEnvironment.name,
        description: decryptedEnvironment.description || ''
      });
      setHasGeneralChanges(false);

      // Try to load decrypted secrets
      try {
        const secretsData = await apiClient.getDecryptedEnvironmentSecrets(environmentId);
        const sortedSecrets = secretsData.sort((a, b) => a.key.localeCompare(b.key));
        setOriginalSecrets(sortedSecrets);
        setPendingSecrets(sortedSecrets.map(s => ({ ...s, _status: 'existing' })));
        setHasSecretsChanges(false);
      } catch (error) {
        console.error('Failed to load secrets (encryption key needed):', error);
        setToastMessage('Failed to decrypt environment secrets');
        setToastType('error');
        showToast();
        // Load empty secrets for now
        setOriginalSecrets([]);
        setPendingSecrets([]);
      }

    } catch (error) {
      console.error('Failed to load environment:', error);
      setToastMessage('Failed to load environment');
      setToastType('error');
      showToast();
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setToastMessage('Environment name is required');
      setToastType('error');
      showToast();
      return;
    }

    try {
      // Update environment details
      await apiClient.updateEnvironment(environment.id, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });

      // Process secret changes - collect all current secrets
      const currentSecrets = pendingSecrets
        .filter(secret => secret._status !== 'deleted')
        .map(secret => ({
          key: secret.key,
          value: secret.value
        }));

      // Update all secrets at once
      await apiClient.updateEnvironmentSecrets(environment.id, currentSecrets);

      setToastMessage('Environment updated successfully');
      setToastType('success');
      showToast();
      setLocation('/environments');
    } catch (error) {
      console.error('Failed to update environment:', error);
      setToastMessage('Failed to update environment');
      setToastType('error');
      showToast();
    }
  };

  const handleAddSecret = (e) => {
    e.preventDefault();

    if (!secretForm.key.trim() || !secretForm.value.trim()) {
      setToastMessage('Both key and value are required');
      setToastType('error');
      showToast();
      return;
    }

    // Check for duplicate keys
    const existingKey = pendingSecrets.find(s => s.key === secretForm.key.trim());
    if (existingKey) {
      setToastMessage('A secret with this key already exists');
      setToastType('error');
      showToast();
      return;
    }

    const newSecret = {
      key: secretForm.key.trim(),
      value: secretForm.value.trim(),
      _status: 'new',
      _tempId: `temp_${Date.now()}`
    };

    setPendingSecrets([...pendingSecrets, newSecret].sort((a, b) => a.key.localeCompare(b.key)));
    setSecretForm({ key: '', value: '' });
    setHasChanges(true);
    setHasSecretsChanges(true);
  };

  const handleEditSecret = (secret) => {
    setEditingSecret({
      _tempId: secret._tempId || secret.key, // Use key as identifier for existing secrets
      key: secret.key,
      value: secret.value
    });
    setEditSecretModal(true);
  };

  const handleUpdateSecret = (e) => {
    e.preventDefault();

    if (!editingSecret.key.trim() || !editingSecret.value.trim()) {
      setToastMessage('Both key and value are required');
      setToastType('error');
      showToast();
      return;
    }

    // Check for duplicate keys (excluding the current secret)
    const existingKey = pendingSecrets.find(s => s.key === editingSecret.key.trim() && (s._tempId || s.key) !== editingSecret._tempId);
    if (existingKey) {
      setToastMessage('A secret with this key already exists');
      setToastType('error');
      showToast();
      return;
    }

    const updatedSecrets = pendingSecrets.map(s => {
      if ((s._tempId || s.key) === editingSecret._tempId) {
        return {
          ...s,
          key: editingSecret.key.trim(),
          value: editingSecret.value.trim(),
          _status: s._status === 'new' ? 'new' : 'updated'
        };
      }
      return s;
    });

    setPendingSecrets(updatedSecrets.sort((a, b) => a.key.localeCompare(b.key)));
    setEditSecretModal(false);
    setHasChanges(true);
    setHasSecretsChanges(true);
  };

  const handleDeleteSecret = () => {
    if (!secretToDelete) return;

    const updatedSecrets = pendingSecrets.filter(s => (s._tempId || s.key) !== secretToDelete);
    setPendingSecrets(updatedSecrets);
    setDeleteSecretModal(false);
    setSecretToDelete(null);
    setHasChanges(true);
    setHasSecretsChanges(true);
  };

  const handleDeleteSuccess = async () => {
    setToastMessage('Environment deleted successfully');
    setToastType('success');
    showToast();
    setLocation('/environments');
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocation('/environments');
      }
    } else {
      setLocation('/environments');
    }
  };

  // Section-specific handlers
  const handleGeneralSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setToastMessage('Environment name is required');
      setToastType('error');
      showToast();
      return;
    }

    try {
      await apiClient.updateEnvironment(environment.id, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });

      setToastMessage('Environment updated successfully');
      setToastType('success');
      showToast();
      setHasGeneralChanges(false);
      setLocation('/environments');
    } catch (error) {
      console.error('Failed to update environment:', error);
      setToastMessage('Failed to update environment');
      setToastType('error');
      showToast();
    }
  };

  const handleSecretsSave = async (e) => {
    e.preventDefault();

    try {
      const currentSecrets = pendingSecrets
        .filter(secret => secret._status !== 'deleted')
        .map(secret => ({
          key: secret.key,
          value: secret.value
        }));

      await apiClient.updateEnvironmentSecrets(environment.id, currentSecrets);

      setToastMessage('Secrets updated successfully');
      setToastType('success');
      showToast();
      setHasSecretsChanges(false);
      setLocation('/environments');
    } catch (error) {
      console.error('Failed to update secrets:', error);
      setToastMessage('Failed to update secrets');
      setToastType('error');
      showToast();
    }
  };

  const handleGeneralCancel = () => {
    if (hasGeneralChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocation('/environments');
      }
    } else {
      setLocation('/environments');
    }
  };

  const handleSecretsCancel = () => {
    if (hasSecretsChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocation('/environments');
      }
    } else {
      setLocation('/environments');
    }
  };

  // Comprehensive save function that saves all sections (general, secrets, and auth)
  const saveAllData = async () => {
    if (!formData.name.trim()) {
      setToastMessage('Environment name is required');
      setToastType('error');
      showToast();
      return false;
    }

    try {
      // Update environment details (general)
      await apiClient.updateEnvironment(environment.id, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });

      // Process secret changes - collect all current secrets
      const currentSecrets = pendingSecrets
        .filter(secret => secret._status !== 'deleted')
        .map(secret => ({
          key: secret.key,
          value: secret.value
        }));

      // Update all secrets at once
      await apiClient.updateEnvironmentSecrets(environment.id, currentSecrets);

      return true;
    } catch (error) {
      console.error('Failed to save all data:', error);
      setToastMessage('Failed to save environment data');
      setToastType('error');
      showToast();
      return false;
    }
  };

  // Auth section handlers
  const handleAuthSave = async () => {
    const success = await saveAllData();
    if (success) {
      setToastMessage('Environment updated successfully');
      setToastType('success');
      showToast();
      setLocation('/environments');
    }
  };

  const handleAuthCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocation('/environments');
      }
    } else {
      setLocation('/environments');
    }
  };

  // Navigation helper for section links
  const handleSectionNavigation = (section, e) => {
    e.preventDefault();
    const basePath = `/environments/${params.uuid}`;
    let newPath = basePath;
    if (section === 'secrets') newPath = `${basePath}/secrets`;
    else if (section === 'auth') newPath = `${basePath}/auth`;
    setLocation(newPath);
  };

  if (isLoading) {
    return (
      <div class="h-full flex items-center justify-center">
        <div class="flex items-center space-x-3 text-gray-500 dark:text-neutral-dark-500">
          <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading environment...</span>
        </div>
      </div>
    );
  }

  if (!environment) {
    return (
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <h2 class="text-lg font-medium text-gray-900 dark:text-neutral-dark-900">Environment not found</h2>
          <p class="text-gray-600 dark:text-neutral-dark-600 mt-2">The environment you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="h-full bg-gray-100 dark:bg-[#282a36] overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        <div class="max-w-6xl mx-auto px-4">

          {/* Sidebar Toggle Button for Mobile - only show when sidebar is hidden */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            class={`fixed top-1/2 -left-1 transform -translate-y-1/2 z-50 bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400 p-2 rounded-r-lg shadow-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${isSidebarOpen ? 'hidden' : 'block md:hidden'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          </button>

          <div class="flex gap-4">
            {/* Desktop Sidebar */}
            <div class="w-64 flex-shrink-0 hidden md:block">
              <div class="bg-white dark:bg-surface-dark-elevated rounded-lg border border-gray-300 dark:border-neutral-dark-50">
                <div class="flex grow flex-col gap-y-5 overflow-y-auto px-6 py-4">
                  <nav class="flex flex-1 flex-col">
                    <ul role="list" class="flex flex-1 flex-col gap-y-7">
                      <li>
                        <div class="text-xs mb-2 text-gray-500 dark:text-neutral-dark-500">Environment</div>
                        <ul role="list" class="-mx-2 space-y-1">
                          <li>
                            <a
                              href={`/environments/${params.uuid}`}
                              onClick={(e) => handleSectionNavigation('general', e)}
                              class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${activeSection === 'general'
                                ? 'bg-sky-50 dark:bg-primary-dark-200 text-sky-500 dark:text-primary-dark-400'
                                : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-50 dark:hover:bg-neutral-dark-200 hover:text-sky-500'
                                }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class={`size-6 shrink-0 ${activeSection === 'general' ? 'text-sky-500 dark:text-primary-dark-400' : 'text-gray-400 dark:text-neutral-dark-400 group-hover:text-sky-500'
                                }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="12" x2="2" y2="12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" y1="16" x2="6.01" y2="16" /><line x1="10" y1="16" x2="10.01" y2="16" />
                              </svg>
                              General
                            </a>
                          </li>
                          <li>
                            <a
                              href={`/environments/${params.uuid}/secrets`}
                              onClick={(e) => handleSectionNavigation('secrets', e)}
                              class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${activeSection === 'secrets'
                                ? 'bg-sky-50 dark:bg-primary-dark-200 text-sky-500 dark:text-primary-dark-400'
                                : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-50 dark:hover:bg-neutral-dark-200 hover:text-sky-500'
                                }`}
                            >
                              <svg class={`size-6 shrink-0 ${activeSection === 'secrets' ? 'text-sky-500 dark:text-primary-dark-400' : 'text-gray-400 dark:text-neutral-dark-400 group-hover:text-sky-500'
                                }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><rect width="8" height="6" x="8" y="12" rx="1" /><path d="M10 12v-2a2 2 0 1 1 4 0v2" />
                              </svg>
                              Secrets
                            </a>
                          </li>
                          <li>
                            <a
                              href={`/environments/${params.uuid}/auth`}
                              onClick={(e) => handleSectionNavigation('auth', e)}
                              class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${activeSection === 'auth'
                                ? 'bg-sky-50 dark:bg-primary-dark-200 text-sky-500 dark:text-primary-dark-400'
                                : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-50 dark:hover:bg-neutral-dark-200 hover:text-sky-500'
                                }`}
                            >
                              <svg class={`size-6 shrink-0 ${activeSection === 'auth' ? 'text-sky-500 dark:text-primary-dark-400' : 'text-gray-400 dark:text-neutral-dark-400 group-hover:text-sky-500'
                                }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" /><path d="M14 13.12c0 2.38 0 6.38-1 8.88" /><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path d="M2 12a10 10 0 0 1 18-6" /><path d="M2 16h.01" /><path d="M21.8 16c.2-2 .131-5.354 0-6" /><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" /><path d="M8.65 22c.21-.66.45-1.32.57-2" /><path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                              </svg>
                              Auth
                            </a>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>

            {/* Mobile Sidebar */}
            {isSidebarOpen && (
              <>
                {/* Full screen overlay covering topbar */}
                <div
                  class="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/60 z-[60] md:hidden animate-fade-in"
                  onClick={() => setIsSidebarOpen(false)}
                />

                {/* Mobile Sidebar - takes full screen minus 75px, covers topbar */}
                <div class="fixed left-0 top-0 bottom-0 right-[75px] bg-white dark:bg-[#282a36] z-[70] md:hidden overflow-y-auto animate-slide-in-left">
                  <div class="p-6">
                    <nav class="flex flex-1 flex-col">
                      <ul role="list" class="flex flex-1 flex-col gap-y-7">
                        <li>
                          <div class="text-xs mb-2 text-gray-500 dark:text-neutral-dark-500">Environment</div>
                          <ul role="list" class="-mx-2 space-y-1">
                            <li>
                              <a
                                href={`/environments/${params.uuid}`}
                                onClick={(e) => {
                                  handleSectionNavigation('general', e);
                                  setIsSidebarOpen(false);
                                }}
                                class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${activeSection === 'general'
                                  ? 'bg-sky-50 dark:bg-primary-dark-200 text-sky-500 dark:text-primary-dark-400'
                                  : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-50 dark:hover:bg-neutral-dark-200 hover:text-sky-500'
                                  }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class={`size-6 shrink-0 ${activeSection === 'general' ? 'text-sky-500 dark:text-primary-dark-400' : 'text-gray-400 dark:text-neutral-dark-400 group-hover:text-sky-500'
                                  }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <line x1="22" y1="12" x2="2" y2="12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" y1="16" x2="6.01" y2="16" /><line x1="10" y1="16" x2="10.01" y2="16" />
                                </svg>
                                General
                              </a>
                            </li>
                            <li>
                              <a
                                href={`/environments/${params.uuid}/secrets`}
                                onClick={(e) => {
                                  handleSectionNavigation('secrets', e);
                                  setIsSidebarOpen(false);
                                }}
                                class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${activeSection === 'secrets'
                                  ? 'bg-sky-50 dark:bg-primary-dark-200 text-sky-500 dark:text-primary-dark-400'
                                  : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-50 dark:hover:bg-neutral-dark-200 hover:text-sky-500'
                                  }`}
                              >
                                <svg class={`size-6 shrink-0 ${activeSection === 'secrets' ? 'text-sky-500 dark:text-primary-dark-400' : 'text-gray-400 dark:text-neutral-dark-400 group-hover:text-sky-500'
                                  }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><rect width="8" height="6" x="8" y="12" rx="1" /><path d="M10 12v-2a2 2 0 1 1 4 0v2" />
                                </svg>
                                Secrets
                              </a>
                            </li>
                            <li>
                              <a
                                href={`/environments/${params.uuid}/auth`}
                                onClick={(e) => {
                                  handleSectionNavigation('auth', e);
                                  setIsSidebarOpen(false);
                                }}
                                class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${activeSection === 'auth'
                                  ? 'bg-sky-50 dark:bg-primary-dark-200 text-sky-500 dark:text-primary-dark-400'
                                  : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-50 dark:hover:bg-neutral-dark-200 hover:text-sky-500'
                                  }`}
                              >
                                <svg class={`size-6 shrink-0 ${activeSection === 'auth' ? 'text-sky-500 dark:text-primary-dark-400' : 'text-gray-400 dark:text-neutral-dark-400 group-hover:text-sky-500'
                                  }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" /><path d="M14 13.12c0 2.38 0 6.38-1 8.88" /><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path d="M2 12a10 10 0 0 1 18-6" /><path d="M2 16h.01" /><path d="M21.8 16c.2-2 .131-5.354 0-6" /><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" /><path d="M8.65 22c.21-.66.45-1.32.57-2" /><path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                                </svg>
                                Auth
                              </a>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </>
            )}

            {/* Content Area */}
            <div class="flex-1 min-w-0 overflow-hidden">
              <div class="bg-white dark:bg-surface-dark-elevated rounded-lg border border-gray-300 dark:border-neutral-dark-50 p-6 w-full max-w-full overflow-hidden">

                {activeSection === 'general' && (
                  <div>
                    <h2 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900">General</h2>
                    <p class="mt-1 text-sm text-gray-600 dark:text-neutral-dark-600 mb-6">Manage your environment details.</p>

                    {/* General Form */}
                    <form onSubmit={handleGeneralSave}>
                      <div class="space-y-6">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <TextInput
                            id="name"
                            value={formData.name}
                            onInput={(e) => {
                              setFormData({ ...formData, name: e.target.value });
                              setHasChanges(true);
                              setHasGeneralChanges(true);
                            }}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <TextInput
                            type="textarea"
                            id="description"
                            rows={3}
                            value={formData.description}
                            onInput={(e) => {
                              setFormData({ ...formData, description: e.target.value });
                              setHasChanges(true);
                              setHasGeneralChanges(true);
                            }}
                          />
                        </div>
                      </div>

                      {/* General Action Buttons */}
                      <div class="mt-6 flex items-center justify-between">
                        <div class="flex items-center gap-x-3">
                          <Button
                            type="submit"
                            variant="primary"
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            onClick={handleGeneralCancel}
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                        </div>
                        <div>
                          <Button
                            onClick={() => setDeleteEnvironmentModal(true)}
                            type="button"
                            variant="danger"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {activeSection === 'secrets' && (
                  <div>
                    <h2 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900">Environment Secrets</h2>
                    <p class="mt-1 mb-6 text-sm text-gray-600 dark:text-neutral-dark-600">Encrypted key-value pairs stored securely for this environment.</p>

                    {/* Add new secret form */}
                    <div class="mb-6">
                      <form onSubmit={handleAddSecret} class="m-0 p-0">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="secret_key">Key</Label>
                            <TextInput
                              id="secret_key"
                              value={secretForm.key}
                              onInput={(e) => setSecretForm({ ...secretForm, key: e.target.value })}
                              placeholder="API_KEY"
                            />
                          </div>
                          <div>
                            <Label htmlFor="secret_value">Value</Label>
                            <div class="flex gap-2">
                              <TextInput
                                type="password"
                                id="secret_value"
                                value={secretForm.value}
                                onInput={(e) => setSecretForm({ ...secretForm, value: e.target.value })}
                                placeholder="your-secret-value"
                              />
                              <Button
                                type="submit"
                                variant="primary"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Existing secrets list */}
                    <div class="overflow-hidden border border-gray-300 dark:border-neutral-dark-50 rounded-lg mb-6">
                      <table class="min-w-full divide-y divide-gray-300 dark:divide-neutral-dark-50">
                        <thead class="bg-gray-50 dark:bg-neutral-dark-200">
                          <tr>
                            <th class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900 sm:pl-6">Key</th>
                            <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-neutral-dark-900">Value</th>
                            <th class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-neutral-dark-300 bg-white dark:bg-surface-dark-elevated">
                          {pendingSecrets.length > 0 ? (
                            pendingSecrets.map((secret) => (
                              <tr key={secret._tempId || secret.key} class={secret._status === 'new' ? 'bg-sky-100 dark:bg-primary-dark-200' : secret._status === 'updated' ? 'bg-yellow-50' : ''}>
                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-neutral-dark-900 sm:pl-6">
                                  {secret.key}
                                  {secret._status === 'new' && <span class="ml-2 text-xs text-sky-700 dark:text-primary-dark-400">(new)</span>}
                                  {secret._status === 'updated' && <span class="ml-2 text-xs text-yellow-600">(modified)</span>}
                                </td>
                                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-neutral-dark-900">
                                  <span class="font-mono">{'•'.repeat(Math.min(secret.value.length, 20))}</span>
                                </td>
                                <td class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                  <Button
                                    type="button"
                                    variant="icon"
                                    size="icon"
                                    onClick={() => handleEditSecret(secret)}
                                  >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="icon"
                                    onClick={() => {
                                      setSecretToDelete(secret._tempId || secret.key);
                                      setDeleteSecretModal(true);
                                    }}
                                  >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colspan="3" class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 dark:text-neutral-dark-500 sm:pl-6">
                                No secrets added yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Secrets Action Buttons */}
                    <div class="flex items-center gap-x-3">
                      <Button
                        onClick={handleSecretsSave}
                        type="button"
                        variant="primary"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSecretsCancel}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {activeSection === 'auth' && (
                  <div>
                    <h2 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900">Authentication</h2>
                    <p class="mt-1 text-sm text-gray-600 dark:text-neutral-dark-600 mb-6">Configure authentication for this environment.</p>

                    {/* Auth Configuration Form */}
                    <AuthSection
                      environment={environment}
                      onUpdate={loadEnvironmentData}
                      onSave={handleAuthSave}
                      onCancel={handleAuthCancel}
                    />
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Secret Modal */}
      <Modal isOpen={editSecretModal} onClose={() => setEditSecretModal(false)} title="Edit Secret" size="md">
        <form onSubmit={handleUpdateSecret}>
          <p class="text-sm text-gray-500 mb-4 text-center sm:text-left">
            Update your environment secret.
          </p>
          <div class="mt-6">
            <Label htmlFor="edit_secret_key">Key</Label>
            <TextInput
              id="edit_secret_key"
              value={editingSecret.key}
              onInput={(e) => setEditingSecret({ ...editingSecret, key: e.target.value })}
            />
          </div>
          <div class="mt-6">
            <Label htmlFor="edit_secret_value">Value</Label>
            <TextInput
              type="password"
              id="edit_secret_value"
              value={editingSecret.value}
              onInput={(e) => setEditingSecret({ ...editingSecret, value: e.target.value })}
            />
          </div>
          <div class="mt-8 flex justify-end gap-3">
            <Button
              onClick={() => setEditSecretModal(false)}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Environment Modal */}
      <DeleteEnvironmentModal
        isOpen={deleteEnvironmentModal}
        onClose={() => setDeleteEnvironmentModal(false)}
        environment={environment}
        onDelete={handleDeleteSuccess}
      />

      {/* Delete Secret Modal */}
      {deleteSecretModal && (
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
          <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
              <div class="relative transform overflow-hidden rounded-lg bg-white dark:bg-surface-dark-elevated px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    onClick={() => setDeleteSecretModal(false)}
                    type="button"
                    class="rounded-md bg-white dark:bg-surface-dark-elevated text-gray-400 dark:text-neutral-dark-400 hover:text-gray-500 dark:hover:text-neutral-dark-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
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
                    <h3 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900">Delete Secret</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">
                        Are you sure you want to delete this secret? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button
                    onClick={handleDeleteSecret}
                    type="button"
                    variant="none"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 sm:ml-3 sm:w-auto"
                  >
                    Delete Secret
                  </Button>
                  <Button
                    onClick={() => setDeleteSecretModal(false)}
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type={toastType}
      />
    </div>
  );
}

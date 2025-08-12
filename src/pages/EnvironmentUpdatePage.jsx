import { useState, useEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'wouter-preact';
import { DeleteEnvironmentModal } from '../components/modals/DeleteEnvironmentModal';
import { EncryptionKeyModal } from '../components/modals/EncryptionKeyModal';
import { Toast, useToast } from '../components/common/Toast';
import { AuthSection } from '../components/auth/AuthSection';
import { apiClient } from '../api';
import { decryptSecret } from '../utils/encryption';

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
  const [encryptionKeyModal, setEncryptionKeyModal] = useState(false);

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
        // Show encryption key modal if needed
        if (apiClient.requiresEncryptionKey()) {
          setEncryptionKeyModal(true);
        } else {
          setToastMessage('Failed to decrypt environment secrets');
          setToastType('error');
          showToast();
        }
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

  const handleEncryptionKeySuccess = async () => {
    // Retry loading secrets and auth fields after encryption key is set
    if (environment) {
      try {
        // Reload secrets
        const secretsData = await apiClient.getDecryptedEnvironmentSecrets(environment.id);
        const sortedSecrets = secretsData.sort((a, b) => a.key.localeCompare(b.key));
        setOriginalSecrets(sortedSecrets);
        setPendingSecrets(sortedSecrets.map(s => ({ ...s, _status: 'existing' })));
        setHasSecretsChanges(false);
        
        // Reload and decrypt auth fields
        const environmentData = await apiClient.getEnvironment(environment.id);
        if (environmentData) {
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
            console.error('Failed to decrypt auth fields after key setup:', error);
          }
          
          setEnvironment(decryptedEnvironment);
        }
      } catch (error) {
        console.error('Failed to load data after key setup:', error);
        setToastMessage('Failed to load environment data');
        setToastType('error');
        showToast();
      }
    }
  };

  const requireEncryptionKey = () => {
    if (apiClient.requiresEncryptionKey()) {
      setEncryptionKeyModal(true);
      return true;
    }
    return false;
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
      if (requireEncryptionKey()) return;

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

    if (requireEncryptionKey()) return;

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
      if (requireEncryptionKey()) return false;

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
        <div class="flex items-center space-x-3 text-gray-500">
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
          <h2 class="text-lg font-medium text-gray-900">Environment not found</h2>
          <p class="text-gray-600 mt-2">The environment you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        <div class="max-w-6xl mx-auto px-4">
          
          {/* Sidebar Toggle Button for Mobile - only show when sidebar is hidden */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            class={`fixed top-1/2 -left-1 transform -translate-y-1/2 z-50 bg-sky-100 hover:bg-sky-200 text-sky-700 p-2 rounded-r-lg shadow-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${
              isSidebarOpen ? 'hidden' : 'block md:hidden'
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
              <div class="bg-white rounded-lg border border-gray-300">
                <div class="flex grow flex-col gap-y-5 overflow-y-auto px-6 py-4">
                  <nav class="flex flex-1 flex-col">
                    <ul role="list" class="flex flex-1 flex-col gap-y-7">
                      <li>
                        <div class="text-xs mb-2 text-gray-500">Environment</div>
                        <ul role="list" class="-mx-2 space-y-1">
                          <li>
                            <a
                              href={`/environments/${params.uuid}`}
                              onClick={(e) => handleSectionNavigation('general', e)}
                              class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${
                                activeSection === 'general'
                                  ? 'bg-sky-50 text-sky-500'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-sky-500'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class={`size-6 shrink-0 ${
                                activeSection === 'general' ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'
                              }`} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 1.25C6.063 1.25 1.25 6.063 1.25 12S6.063 22.75 12 22.75S22.75 17.937 22.75 12S17.937 1.25 12 1.25M2.75 12a9.25 9.25 0 1 1 16.282 6.01a4.84 4.84 0 0 0-1.17-2.034c-.782-.813-1.76-1.286-2.608-1.55c-.626-.195-1.216.03-1.604.293c-.36.242-.94.531-1.65.531s-1.29-.29-1.65-.531c-.388-.262-.978-.488-1.604-.293c-.849.264-1.826.737-2.608 1.55a4.84 4.84 0 0 0-1.17 2.033A9.2 9.2 0 0 1 2.75 12m3.513 7.256c.076-1.011.46-1.724.957-2.241c.553-.576 1.28-.941 1.972-1.157a.2.2 0 0 1 .103.003a.7.7 0 0 1 .216.101c.501.338 1.374.788 2.489.788s1.988-.45 2.489-.788a.7.7 0 0 1 .216-.1a.2.2 0 0 1 .103-.004c.692.216 1.419.581 1.972 1.157c.497.517.88 1.23.957 2.241A9.2 9.2 0 0 1 12 21.25a9.2 9.2 0 0 1-5.737-1.994M9.75 10c0-1.25.97-2.25 2.25-2.25s2.25 1 2.25 2.25s-.97 2.25-2.25 2.25s-2.25-1-2.25-2.25M12 6.25A3.72 3.72 0 0 0 8.25 10A3.72 3.72 0 0 0 12 13.75A3.72 3.72 0 0 0 15.75 10A3.72 3.72 0 0 0 12 6.25" />
                              </svg>
                              General
                            </a>
                          </li>
                          <li>
                            <a
                              href={`/environments/${params.uuid}/secrets`}
                              onClick={(e) => handleSectionNavigation('secrets', e)}
                              class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${
                                activeSection === 'secrets'
                                  ? 'bg-sky-50 text-sky-500'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-sky-500'
                              }`}
                            >
                              <svg class={`size-6 shrink-0 ${
                                activeSection === 'secrets' ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'
                              }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" /><path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
                              </svg>
                              Secrets
                            </a>
                          </li>
                          <li>
                            <a
                              href={`/environments/${params.uuid}/auth`}
                              onClick={(e) => handleSectionNavigation('auth', e)}
                              class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${
                                activeSection === 'auth'
                                  ? 'bg-sky-50 text-sky-500'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-sky-500'
                              }`}
                            >
                              <svg class={`size-6 shrink-0 ${
                                activeSection === 'auth' ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'
                              }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 12l2 2 4-4" />
                                <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V5c0-2.209-1.791-4-4-4H7C4.791 1 3 2.791 3 5v2H2c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v2c0 2.209 1.791 4 4 4h10c2.209 0 4-1.791 4-4v-2z" />
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
                  class="fixed inset-0 bg-gray-500/75 z-[60] md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />

                {/* Mobile Sidebar - takes full screen minus 75px, covers topbar */}
                <div class="fixed left-0 top-0 bottom-0 right-[75px] bg-white z-[70] md:hidden overflow-y-auto">
                  <div class="p-6">
                    <nav class="flex flex-1 flex-col">
                      <ul role="list" class="flex flex-1 flex-col gap-y-7">
                        <li>
                          <div class="text-xs mb-2 text-gray-500">Environment</div>
                          <ul role="list" class="-mx-2 space-y-1">
                            <li>
                              <a
                                href={`/environments/${params.uuid}`}
                                onClick={(e) => {
                                  handleSectionNavigation('general', e);
                                  setIsSidebarOpen(false);
                                }}
                                class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${
                                  activeSection === 'general'
                                    ? 'bg-sky-50 text-sky-500'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-sky-500'
                                }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class={`size-6 shrink-0 ${
                                  activeSection === 'general' ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'
                                }`} viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 1.25C6.063 1.25 1.25 6.063 1.25 12S6.063 22.75 12 22.75S22.75 17.937 22.75 12S17.937 1.25 12 1.25M2.75 12a9.25 9.25 0 1 1 16.282 6.01a4.84 4.84 0 0 0-1.17-2.034c-.782-.813-1.76-1.286-2.608-1.55c-.626-.195-1.216.03-1.604.293c-.36.242-.94.531-1.65.531s-1.29-.29-1.65-.531c-.388-.262-.978-.488-1.604-.293c-.849.264-1.826.737-2.608 1.55a4.84 4.84 0 0 0-1.17 2.033A9.2 9.2 0 0 1 2.75 12m3.513 7.256c.076-1.011.46-1.724.957-2.241c.553-.576 1.28-.941 1.972-1.157a.2.2 0 0 1 .103.003a.7.7 0 0 1 .216.101c.501.338 1.374.788 2.489.788s1.988-.45 2.489-.788a .7.7 0 0 1 .216-.1a.2.2 0 0 1 .103-.004c.692.216 1.419.581 1.972 1.157c.497.517.88 1.23.957 2.241A9.2 9.2 0 0 1 12 21.25a9.2 9.2 0 0 1-5.737-1.994M9.75 10c0-1.25.97-2.25 2.25-2.25s2.25 1 2.25 2.25s-.97 2.25-2.25 2.25s-2.25-1-2.25-2.25M12 6.25A3.72 3.72 0 0 0 8.25 10A3.72 3.72 0 0 0 12 13.75A3.72 3.72 0 0 0 15.75 10A3.72 3.72 0 0 0 12 6.25" />
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
                                class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${
                                  activeSection === 'secrets'
                                    ? 'bg-sky-50 text-sky-500'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-sky-500'
                                }`}
                              >
                                <svg class={`size-6 shrink-0 ${
                                  activeSection === 'secrets' ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'
                                }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" /><path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
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
                                class={`group flex gap-x-3 rounded-md p-1.5 text-sm/6 w-full text-left cursor-pointer ${
                                  activeSection === 'auth'
                                    ? 'bg-sky-50 text-sky-500'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-sky-500'
                                }`}
                              >
                                <svg class={`size-6 shrink-0 ${
                                  activeSection === 'auth' ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'
                                }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M9 12l2 2 4-4" />
                                  <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V5c0-2.209-1.791-4-4-4H7C4.791 1 3 2.791 3 5v2H2c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h1v2c0 2.209 1.791 4 4 4h10c2.209 0 4-1.791 4-4v-2z" />
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
              <div class="bg-white rounded-lg border border-gray-300 p-6 w-full max-w-full overflow-hidden">

                {activeSection === 'general' && (
                  <div>
                    <h2 class="text-base font-semibold text-gray-900">General</h2>
                    <p class="mt-1 text-sm text-gray-600 mb-6">Manage your environment details.</p>

                    {/* General Form */}
                    <form onSubmit={handleGeneralSave}>
                      <div class="space-y-6">
                        <div>
                          <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                          <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onInput={(e) => {
                              setFormData({ ...formData, name: e.target.value });
                              setHasChanges(true);
                              setHasGeneralChanges(true);
                            }}
                            class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            id="description"
                            rows="3"
                            value={formData.description}
                            onInput={(e) => {
                              setFormData({ ...formData, description: e.target.value });
                              setHasChanges(true);
                              setHasGeneralChanges(true);
                            }}
                            class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* General Action Buttons */}
                      <div class="mt-6 flex items-center justify-between">
                        <div class="flex items-center gap-x-3">
                          <button
                            type="submit"
                            class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleGeneralCancel}
                            class="cursor-pointer rounded-md bg-white hover:bg-gray-50 px-3 py-2 text-sm border border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                          >
                            Cancel
                          </button>
                        </div>
                        <div>
                          <button
                            onClick={() => setDeleteEnvironmentModal(true)}
                            type="button"
                            class="cursor-pointer rounded-md bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          >
                            Delete Environment
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {activeSection === 'secrets' && (
                  <div>
                    <h2 class="text-base font-semibold text-gray-900">Environment Secrets</h2>
                    <p class="mt-1 mb-4 text-sm text-gray-600">Encrypted key-value pairs stored securely for this environment.</p>

                    {/* Add new secret form */}
                    <div class="mb-6">
                      <form onSubmit={handleAddSecret} class="m-0 p-0">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label for="secret_key" class="block text-sm font-medium text-gray-700">Key</label>
                            <input
                              type="text"
                              id="secret_key"
                              value={secretForm.key}
                              onInput={(e) => setSecretForm({ ...secretForm, key: e.target.value })}
                              class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                              placeholder="API_KEY"
                            />
                          </div>
                          <div>
                            <label for="secret_value" class="block text-sm font-medium text-gray-700">Value</label>
                            <div class="flex mt-1">
                              <input
                                type="password"
                                id="secret_value"
                                value={secretForm.value}
                                onInput={(e) => setSecretForm({ ...secretForm, value: e.target.value })}
                                class="block w-full rounded-l-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                                placeholder="your-secret-value"
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

                    {/* Existing secrets list */}
                    <div class="overflow-hidden border border-gray-300 rounded-lg mb-6">
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
                          {pendingSecrets.length > 0 ? (
                            pendingSecrets.map((secret) => (
                              <tr key={secret._tempId || secret.key} class={secret._status === 'new' ? 'bg-blue-50' : secret._status === 'updated' ? 'bg-yellow-50' : ''}>
                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                  {secret.key}
                                  {secret._status === 'new' && <span class="ml-2 text-xs text-blue-600">(new)</span>}
                                  {secret._status === 'updated' && <span class="ml-2 text-xs text-yellow-600">(modified)</span>}
                                </td>
                                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                  <span class="font-mono">{'•'.repeat(Math.min(secret.value.length, 20))}</span>
                                </td>
                                <td class="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditSecret(secret)}
                                    class="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-medium rounded-md cursor-pointer inline-block"
                                  >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSecretToDelete(secret._tempId || secret.key);
                                      setDeleteSecretModal(true);
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
                                No secrets added yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Secrets Action Buttons */}
                    <div class="flex items-center gap-x-3">
                      <button
                        onClick={handleSecretsSave}
                        type="button"
                        class="cursor-pointer rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleSecretsCancel}
                        class="cursor-pointer rounded-md bg-white hover:bg-gray-50 px-3 py-2 text-sm border border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {activeSection === 'auth' && (
                  <div>
                    <h2 class="text-base font-semibold text-gray-900">Authentication</h2>
                    <p class="mt-1 text-sm text-gray-600 mb-6">Configure authentication for this environment.</p>

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

      {/* Encryption Key Modal */}
      <EncryptionKeyModal
        isOpen={encryptionKeyModal}
        onClose={() => setEncryptionKeyModal(false)}
        onSuccess={handleEncryptionKeySuccess}
      />

      {/* Edit Secret Modal */}
      {editSecretModal && (
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
          <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
              <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg sm:p-6">
                <form onSubmit={handleUpdateSecret}>
                  <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      onClick={() => setEditSecretModal(false)}
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
                    <h3 class="text-base font-semibold text-gray-900">Edit Secret</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">Update your environment secret.</p>
                    </div>
                    <div class="mt-6">
                      <label for="edit_secret_key" class="block text-sm font-medium text-gray-700">Key</label>
                      <input
                        type="text"
                        id="edit_secret_key"
                        value={editingSecret.key}
                        onInput={(e) => setEditingSecret({ ...editingSecret, key: e.target.value })}
                        class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                      />
                    </div>
                    <div class="mt-6">
                      <label for="edit_secret_value" class="block text-sm font-medium text-gray-700">Value</label>
                      <input
                        type="password"
                        id="edit_secret_value"
                        value={editingSecret.value}
                        onInput={(e) => setEditingSecret({ ...editingSecret, value: e.target.value })}
                        class="mt-1 block w-full rounded-md px-3 py-1.5 text-gray-900 outline outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-sky-500 text-sm"
                      />
                    </div>
                  </div>
                  <div class="mt-8 flex justify-end">
                    <button
                      onClick={() => setEditSecretModal(false)}
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
              <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    onClick={() => setDeleteSecretModal(false)}
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
                    <h3 class="text-base font-semibold text-gray-900">Delete Secret</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">
                        Are you sure you want to delete this secret? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleDeleteSecret}
                    type="button"
                    class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 sm:ml-3 sm:w-auto cursor-pointer"
                  >
                    Delete Secret
                  </button>
                  <button
                    onClick={() => setDeleteSecretModal(false)}
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

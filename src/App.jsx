import { useState, useEffect } from 'preact/hooks';
import { Router, Route, Switch } from 'wouter-preact';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageLayout } from './components/layout/FullPageLayout';
import { TopBar } from './components/layout/TopBar';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { RequestPage } from './pages/RequestPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CollectionUpdatePage } from './pages/CollectionUpdatePage';
import { EnvironmentsPage } from './pages/EnvironmentsPage';
import { EnvironmentUpdatePage } from './pages/EnvironmentUpdatePage';
import { SettingsPage } from './pages/SettingsPage';
import { URLImportModal } from './components/import/URLImportModal';
import { AppEncryptionKeyModal } from './components/modals/AppEncryptionKeyModal';
import { ClearEnvironmentsModal } from './components/modals/ClearEnvironmentsModal';
import { apiClient } from './api';
import { hasSessionKey } from './utils/encryption';

export function App() {
  const [urlImportModal, setUrlImportModal] = useState({
    isOpen: false,
    importUrl: ''
  });
  const [encryptionKeyModal, setEncryptionKeyModal] = useState({
    isOpen: false,
    environmentCount: 0,
    secretCount: 0
  });
  const [clearEnvironmentsModal, setClearEnvironmentsModal] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  // Check for environments and encryption key on mount
  useEffect(() => {
    checkEnvironmentsAndInitialize();
  }, []);

  const checkEnvironmentsAndInitialize = async () => {
    try {
      // Check if we have environments
      const environments = await apiClient.getAllEnvironments();
      
      if (environments.length > 0 && !hasSessionKey()) {
        // Count total secrets across all environments
        let totalSecrets = 0;
        for (const environment of environments) {
          const secretCount = await apiClient.countEnvironmentSecrets(environment.id);
          totalSecrets += secretCount;
        }
        
        // Show encryption key modal
        setEncryptionKeyModal({
          isOpen: true,
          environmentCount: environments.length,
          secretCount: totalSecrets
        });
      } else {
        // No environments or encryption key already available, proceed with app initialization
        initializeApp();
      }
    } catch (error) {
      console.error('Failed to check environments:', error);
      // On error, proceed with app initialization
      initializeApp();
    }
  };

  const initializeApp = () => {
    setIsAppReady(true);
    
    // Check for import URL parameter after app is ready
    const urlParams = new URLSearchParams(window.location.search);
    const importUrl = urlParams.get('import');
    
    if (importUrl) {
      // Show the import modal
      setUrlImportModal({
        isOpen: true,
        importUrl: decodeURIComponent(importUrl)
      });
    }
  };

  const handleCloseUrlImport = () => {
    setUrlImportModal({
      isOpen: false,
      importUrl: ''
    });
    
    // Clear the import parameter from URL
    const url = new URL(window.location);
    url.searchParams.delete('import');
    window.history.replaceState({}, '', url.toString());
  };

  const handleUrlImportSuccess = (collection) => {
    console.log('URL import successful:', collection);
    handleCloseUrlImport();
  };

  const handleEncryptionKeySuccess = () => {
    setEncryptionKeyModal({
      isOpen: false,
      environmentCount: 0,
      secretCount: 0
    });
    initializeApp();
  };

  const handleEncryptionKeyClose = () => {
    // Don't allow closing without providing the key
    // User must either provide password or clear environments
  };

  const handleForgotPassword = () => {
    setEncryptionKeyModal({
      isOpen: false,
      environmentCount: 0,
      secretCount: 0
    });
    setClearEnvironmentsModal(true);
  };

  const handleClearEnvironments = async () => {
    try {
      // Clear all environments from the database
      const environments = await apiClient.getAllEnvironments();
      for (const environment of environments) {
        await apiClient.deleteEnvironment(environment.id);
      }
      
      // Clear the encrypted reference from localStorage since we're starting fresh
      localStorage.removeItem('encrypted-reference');
      
      // Reset all modal states
      setClearEnvironmentsModal(false);
      setEncryptionKeyModal({
        isOpen: false,
        environmentCount: 0,
        secretCount: 0
      });
      
      // Initialize the app normally
      initializeApp();
    } catch (error) {
      console.error('Failed to clear environments:', error);
      throw error;
    }
  };

  const handleClearEnvironmentsCancel = () => {
    setClearEnvironmentsModal(false);
    setEncryptionKeyModal({
      isOpen: true,
      environmentCount: encryptionKeyModal.environmentCount,
      secretCount: encryptionKeyModal.secretCount
    });
  };

  // Don't render the main app until we've checked for environments and handled encryption
  if (!isAppReady) {
    return (
      <div class="h-screen bg-gray-100 flex items-center justify-center">
        {/* Only show loading spinner if we haven't determined what to show yet */}
        {!encryptionKeyModal.isOpen && !clearEnvironmentsModal && (
          <div class="text-center">
            <div class="flex items-center justify-center mb-4">
              <svg class="animate-spin w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p class="text-gray-600">Loading Slingshot...</p>
          </div>
        )}

        {/* App Encryption Key Modal */}
        <AppEncryptionKeyModal
          isOpen={encryptionKeyModal.isOpen}
          onClose={handleEncryptionKeyClose}
          onSuccess={handleEncryptionKeySuccess}
          environmentCount={encryptionKeyModal.environmentCount}
          secretCount={encryptionKeyModal.secretCount}
          onForgotPassword={handleForgotPassword}
        />

        {/* Clear Environments Modal */}
        <ClearEnvironmentsModal
          isOpen={clearEnvironmentsModal}
          onClose={handleClearEnvironmentsCancel}
          onClear={handleClearEnvironments}
        />
      </div>
    );
  }

  return (
    <AppProvider>
      <div class="min-h-screen flex flex-col bg-gray-50">
        {/* Persistent TopBar across all routes */}
        <TopBar />
        
        <Router>
          <Switch>
            <Route path="/collections/:uuid">
              <FullPageLayout>
                <CollectionUpdatePage />
              </FullPageLayout>
            </Route>
            <Route path="/collections">
              <FullPageLayout>
                <CollectionsPage />
              </FullPageLayout>
            </Route>
            <Route path="/environments/:uuid">
              <FullPageLayout>
                <EnvironmentUpdatePage />
              </FullPageLayout>
            </Route>
            <Route path="/environments">
              <FullPageLayout>
                <EnvironmentsPage />
              </FullPageLayout>
            </Route>
            <Route path="/settings">
              <FullPageLayout>
                <SettingsPage />
              </FullPageLayout>
            </Route>
            <Route>
              <AppLayout>
                <Switch>
                  <Route path="/" component={HomePage} />
                  <Route path="/:collectionId" component={CollectionPage} />
                  <Route path="/:collectionId/:requestId" component={RequestPage} />
                </Switch>
              </AppLayout>
            </Route>
          </Switch>
        </Router>

        {/* URL Import Modal */}
        <URLImportModal
          isOpen={urlImportModal.isOpen}
          importUrl={urlImportModal.importUrl}
          onClose={handleCloseUrlImport}
          onSuccess={handleUrlImportSuccess}
        />
      </div>
    </AppProvider>
  );
}
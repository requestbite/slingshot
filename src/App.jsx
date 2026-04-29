import { useState, useEffect } from 'preact/hooks';
import { Suspense, lazy } from 'preact/compat';
import { Router, Route, Switch, useLocation } from 'wouter-preact';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageLayout } from './components/layout/FullPageLayout';
import { TopBar } from './components/layout/TopBar';

// Dynamic imports for pages - these are split into separate chunks
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const CollectionPage = lazy(() => import('./pages/CollectionPage').then(m => ({ default: m.CollectionPage })));
const RequestPage = lazy(() => import('./pages/RequestPage').then(m => ({ default: m.RequestPage })));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage').then(m => ({ default: m.CollectionsPage })));
const CollectionUpdatePage = lazy(() => import('./pages/CollectionUpdatePage').then(m => ({ default: m.CollectionUpdatePage })));
const ApiCatalogPage = lazy(() => import('./pages/ApiCatalogPage').then(m => ({ default: m.ApiCatalogPage })));
const ApiCatalogDetailsPage = lazy(() => import('./pages/ApiCatalogDetailsPage').then(m => ({ default: m.ApiCatalogDetailsPage })));
const EnvironmentsPage = lazy(() => import('./pages/EnvironmentsPage').then(m => ({ default: m.EnvironmentsPage })));
const EnvironmentUpdatePage = lazy(() => import('./pages/EnvironmentUpdatePage').then(m => ({ default: m.EnvironmentUpdatePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ScreenshotMakerPage = lazy(() => import('./pages/ScreenshotMakerPage').then(m => ({ default: m.ScreenshotMakerPage })));
const OpenAPIViewerPage = lazy(() => import('./pages/OpenAPIViewerPage').then(m => ({ default: m.OpenAPIViewerPage })));
const AuthCallback = lazy(() => import('./components/auth/AuthCallback').then(m => ({ default: m.AuthCallback })));
// Dynamic imports for modals that are only used conditionally
const URLImportModal = lazy(() => import('./components/import/URLImportModal').then(m => ({ default: m.URLImportModal })));
import { AppEncryptionKeyModal } from './components/modals/AppEncryptionKeyModal';
import { ClearEnvironmentsModal } from './components/modals/ClearEnvironmentsModal';
import { apiClient } from './api';
import { hasSessionKey } from './utils/encryption';
import { generateUUID } from './utils/uuid.js';
import { encryptionWorkerManager } from './utils/encryptionWorkerManager.js';

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
  const [sharedRequestData, setSharedRequestData] = useState(null);

  // Check for environments and encryption key on mount
  useEffect(() => {
    checkEnvironmentsAndInitialize();
  }, []);

  const checkEnvironmentsAndInitialize = async () => {
    try {
      // Initialize SharedWorker for cross-tab encryption key sharing
      try {
        // Set a shorter timeout for initialization to avoid blocking app startup
        const initPromise = encryptionWorkerManager.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Worker initialization timeout')), 2000);
        });

        const workerInitialized = await Promise.race([initPromise, timeoutPromise]);

        if (workerInitialized) {
          console.log('[App] SharedWorker initialized for cross-tab encryption key sharing');

          // Listen for key events from other tabs
          encryptionWorkerManager.addEventListener('KEY_STORED', () => {
            console.log('[App] Encryption key shared from another tab');
          });

          encryptionWorkerManager.addEventListener('KEY_CLEARED', () => {
            console.log('[App] Encryption key cleared from another tab');
          });

          encryptionWorkerManager.addEventListener('INACTIVITY_TIMEOUT', () => {
            console.log('[App] Encryption key cleared due to inactivity');
          });
        } else {
          console.log('[App] SharedWorker not available, falling back to sessionStorage');
        }
      } catch (error) {
        console.warn('[App] SharedWorker initialization failed, continuing with sessionStorage fallback:', error.message);
      }

      // Check if we have environments
      const environments = await apiClient.getAllEnvironments();

      if (environments.length > 0 && !(await hasSessionKey())) {
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
    const sharedRequest = urlParams.get('r');

    if (importUrl) {
      // Show the import modal
      setUrlImportModal({
        isOpen: true,
        importUrl: decodeURIComponent(importUrl)
      });
    }

    // Check for shared request parameter (only on base URL)
    if (sharedRequest && window.location.pathname === '/') {
      try {
        const decodedJson = atob(sharedRequest);
        const requestData = JSON.parse(decodedJson);

        // Transform the data to match RequestEditor's expected format
        const formattedRequestData = {
          method: requestData.method || 'GET',
          url: requestData.url || '',
          headers: requestData.headers ? Object.entries(requestData.headers).map(([key, value]) => ({
            id: generateUUID(),
            key: key,
            value: value,
            enabled: true
          })) : [],
          queryParams: requestData.params ? Object.entries(requestData.params).map(([key, value]) => ({
            id: generateUUID(),
            key: key,
            value: value,
            enabled: true
          })) : [],
          pathParams: [],
          bodyType: requestData.requestType || 'none',
          contentType: requestData.contentType || 'application/json',
          bodyContent: requestData.body || '',
          formData: requestData.formData?.map(f => ({
            id: generateUUID(),
            key: f.key,
            value: f.value,
            type: f.type || 'text',
            enabled: true
          })) || [],
          urlEncodedData: []
        };

        setSharedRequestData(formattedRequestData);

        // Clean up the URL parameter
        const url = new URL(window.location);
        url.searchParams.delete('r');
        window.history.replaceState({}, '', url.toString());
      } catch (error) {
        console.error('Failed to decode shared request:', error);
        // Clean up invalid parameter
        const url = new URL(window.location);
        url.searchParams.delete('r');
        window.history.replaceState({}, '', url.toString());
      }
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

  const handleOpenUrlImport = (importUrl = '') => {
    setUrlImportModal({
      isOpen: true,
      importUrl
    });
  };

  // Make the import function globally available for the welcome message
  useEffect(() => {
    window.openUrlImportModal = handleOpenUrlImport;
    return () => {
      delete window.openUrlImportModal;
    };
  }, []);

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
      <div class="h-screen bg-gray-100 dark:bg-[#282a36] flex items-center justify-center">
        {/* Only show loading spinner if we haven't determined what to show yet */}
        {!encryptionKeyModal.isOpen && !clearEnvironmentsModal && (
          <div class="text-center">
            <div class="flex items-center justify-center mb-4">
              <svg class="animate-spin w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p class="text-gray-600 dark:text-neutral-dark-600">Loading Slingshot...</p>
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

  // Component to handle route-specific styling
  function AppContent() {
    const [location] = useLocation();

    if (location.startsWith('/openapi')) {
      return (
        <div class="h-screen flex flex-col bg-gray-100">
          <TopBar />
          <div class="flex-1 flex items-center justify-center">
            <Suspense fallback={<div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>}>
              <OpenAPIViewerPage />
            </Suspense>
          </div>
        </div>
      );
    }

    // Check if current route should use min-h-screen instead of h-screen
    // These are the routes that use AppLayout (not FullPageLayout)
    const isAppLayoutRoute = location === '/' ||
      (location.match(/^\/[^/]+$/) && !location.startsWith('/collections') && !location.startsWith('/catalog') && !location.startsWith('/environments') && !location.startsWith('/settings') && !location.startsWith('/tools')) ||
      (location.match(/^\/[^/]+\/[^/]+$/) && !location.startsWith('/collections/') && !location.startsWith('/catalog/') && !location.startsWith('/environments/') && !location.startsWith('/tools/'));

    const containerClass = isAppLayoutRoute ?
      "min-h-screen flex flex-col bg-gray-50 dark:bg-[#282a36]" :
      "h-screen flex flex-col bg-gray-50 dark:bg-[#282a36]";

    return (
      <div class={containerClass}>
        {/* Persistent TopBar across all routes */}
        <TopBar />

        <Suspense fallback={<div class="flex items-center justify-center h-64"><div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>}>
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
            <Route path="/catalog/category/:key/:page?">
              <FullPageLayout>
                <ApiCatalogPage />
              </FullPageLayout>
            </Route>
            <Route path="/catalog/api/:param1/:param2?/:param3?">
              <FullPageLayout>
                <ApiCatalogDetailsPage />
              </FullPageLayout>
            </Route>
            <Route path="/catalog">
              <FullPageLayout>
                <ApiCatalogPage />
              </FullPageLayout>
            </Route>
            <Route path="/environments/:uuid/secrets">
              <FullPageLayout>
                <EnvironmentUpdatePage />
              </FullPageLayout>
            </Route>
            <Route path="/environments/:uuid/auth">
              <FullPageLayout>
                <EnvironmentUpdatePage />
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
            <Route path="/tools/screenshot-editor">
              <FullPageLayout>
                <ScreenshotMakerPage />
              </FullPageLayout>
            </Route>
            <Route path="/auth/callback">
              <AuthCallback />
            </Route>
            <Route>
              <Switch>
                <Route path="/:collectionId/:requestId">
                  <AppLayout showDocsSidebar={true}>
                    <RequestPage />
                  </AppLayout>
                </Route>
                <Route>
                  <AppLayout>
                    <Switch>
                      <Route path="/">
                        <HomePage sharedRequestData={sharedRequestData} />
                      </Route>
                      <Route path="/:collectionId" component={CollectionPage} />
                    </Switch>
                  </AppLayout>
                </Route>
              </Switch>
            </Route>
          </Switch>
        </Suspense>

        {/* URL Import Modal */}
        {urlImportModal.isOpen && (
          <Suspense fallback={null}>
            <URLImportModal
              isOpen={urlImportModal.isOpen}
              importUrl={urlImportModal.importUrl}
              onClose={handleCloseUrlImport}
              onSuccess={handleUrlImportSuccess}
            />
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AppProvider>
        <Router>
          <AppContent />
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

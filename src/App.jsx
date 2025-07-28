import { useState, useEffect } from 'preact/hooks';
import { Router, Route, Switch } from 'wouter-preact';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageLayout } from './components/layout/FullPageLayout';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { RequestPage } from './pages/RequestPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CollectionUpdatePage } from './pages/CollectionUpdatePage';
import { SettingsPage } from './pages/SettingsPage';
import { URLImportModal } from './components/import/URLImportModal';

export function App() {
  const [urlImportModal, setUrlImportModal] = useState({
    isOpen: false,
    importUrl: ''
  });

  // Check for import URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const importUrl = urlParams.get('import');
    
    if (importUrl) {
      // Show the import modal
      setUrlImportModal({
        isOpen: true,
        importUrl: decodeURIComponent(importUrl)
      });
    }
  }, []);

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

  return (
    <AppProvider>
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
    </AppProvider>
  );
}
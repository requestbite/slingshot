import { Router, Route, Switch } from 'wouter-preact';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageLayout } from './components/layout/FullPageLayout';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { RequestPage } from './pages/RequestPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CollectionUpdatePage } from './pages/CollectionUpdatePage';

export function App() {
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
    </AppProvider>
  );
}
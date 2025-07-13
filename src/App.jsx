import { Router, Route, Switch } from 'wouter-preact';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { RequestPage } from './pages/RequestPage';

export function App() {
  return (
    <AppProvider>
      <Router>
        <AppLayout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/:collectionId" component={CollectionPage} />
            <Route path="/:collectionId/:requestId" component={RequestPage} />
          </Switch>
        </AppLayout>
      </Router>
    </AppProvider>
  );
}
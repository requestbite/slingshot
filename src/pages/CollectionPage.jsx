import { Suspense, lazy } from 'preact/compat';
import { useAppContext } from '../hooks/useAppContext';
import { usePageTitle } from '../hooks/usePageTitle';

// Dynamic import for RequestEditor
const RequestEditor = lazy(() => import('../components/request/RequestEditor').then(m => ({ default: m.RequestEditor })));

export function CollectionPage() {
  const { selectedCollection } = useAppContext();

  // Set page title based on collection name
  usePageTitle(selectedCollection?.name);

  return (
    <div class="h-full">
      <Suspense fallback={<div class="flex items-center justify-center h-full"><div class="text-gray-500 dark:text-neutral-dark-500">Loading...</div></div>}>
        <RequestEditor />
      </Suspense>
    </div>
  );
}
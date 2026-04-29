import { Suspense, lazy } from 'preact/compat';
import { usePageTitle } from '../hooks/usePageTitle';

// Dynamic import for RequestEditor
const RequestEditor = lazy(() => import('../components/request/RequestEditor').then(m => ({ default: m.RequestEditor })));

export function HomePage({ sharedRequestData }) {
  usePageTitle('Slingshot'); // Sets default "RequestBite Slingshot" title
  return (
    <div class="h-full">
      <Suspense fallback={<div class="flex items-center justify-center h-full"><div class="text-gray-500 dark:text-neutral-dark-500">Loading...</div></div>}>
        <RequestEditor sharedRequestData={sharedRequestData} />
      </Suspense>
    </div>
  );
}

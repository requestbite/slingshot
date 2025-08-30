import { RequestEditor } from '../components/request/RequestEditor';
import { useAppContext } from '../hooks/useAppContext';
import { usePageTitle } from '../hooks/usePageTitle';

export function CollectionPage() {
  const { selectedCollection } = useAppContext();
  
  // Set page title based on collection name
  usePageTitle(selectedCollection?.name);
  
  return (
    <div class="h-full">
      <RequestEditor />
    </div>
  );
}
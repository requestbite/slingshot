import { RequestEditor } from '../components/request/RequestEditor';
import { usePageTitle } from '../hooks/usePageTitle';

export function HomePage({ sharedRequestData }) {
  usePageTitle('Slingshot'); // Sets default "RequestBite Slingshot" title
  return (
    <div class="h-full">
      <RequestEditor sharedRequestData={sharedRequestData} />
    </div>
  );
}

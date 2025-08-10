import { RequestEditor } from '../components/request/RequestEditor';

export function HomePage({ sharedRequestData }) {
  return (
    <div class="h-full">
      <RequestEditor sharedRequestData={sharedRequestData} />
    </div>
  );
}
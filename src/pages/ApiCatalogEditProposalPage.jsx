import { useState, useEffect } from 'preact/hooks';
import { useRoute, useLocation } from 'wouter-preact';
import { ApiCatalogNewEntryPage } from './ApiCatalogNewEntryPage';

export function ApiCatalogEditProposalPage() {
  const [match, params] = useRoute('/catalog/edit/:uuid');
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    const fetchProposalData = async () => {
      const uuid = params.uuid;
      const apiBase = import.meta.env.VITE_CATALOG_API;

      try {
        // 1. Fetch metadata
        const metadataResponse = await fetch(`${apiBase}/v1/apis/propose/${uuid}`);
        if (!metadataResponse.ok) {
          if (metadataResponse.status === 404) {
            throw new Error('Proposal not found');
          }
          throw new Error(`Failed to fetch proposal: ${metadataResponse.status}`);
        }
        const data = await metadataResponse.json();

        // 2. Populate localStorage with metadata
        localStorage.setItem('api-catalog-draft-entry', JSON.stringify(data.metadata));

        // 3. Fetch image if exists
        if (data.imagePath) {
          try {
            const imageResponse = await fetch(`${apiBase}/v1/apis/propose/${uuid}/image`);
            if (imageResponse.ok) {
              const contentType = imageResponse.headers.get('Content-Type') || 'image/png';
              const blob = await imageResponse.blob();
              const filename = data.imagePath.split('/').pop() || 'proposal-image.png';
              const file = new File([blob], filename, { type: contentType });
              setImageFile(file);
            } else {
              console.warn('Image referenced but not found in S3');
            }
          } catch (imageErr) {
            console.warn('Failed to fetch image, continuing without it:', imageErr);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (params && params.uuid) {
      fetchProposalData();
    }
  }, [params.uuid]);

  if (loading) {
    return (
      <div class="h-full bg-gray-100 overflow-y-auto">
        <div class="min-h-full pt-[83px] pb-6">
          <div class="max-w-4xl mx-auto px-4">
            <div class="flex items-center justify-center py-12">
              <div class="text-center">
                <div class="flex items-center justify-center mb-4">
                  <svg class="animate-spin w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <p class="text-gray-600">Loading proposal...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="h-full bg-gray-100 overflow-y-auto">
        <div class="min-h-full pt-[83px] pb-6">
          <div class="max-w-4xl mx-auto px-4">
            <div class="bg-white rounded-lg border border-gray-300 p-6">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 class="mt-4 text-lg font-medium text-gray-900">Error Loading Proposal</h3>
                <p class="mt-2 text-sm text-gray-600">{error}</p>
                <div class="mt-6">
                  <a
                    href="/catalog"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Return to Catalog
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ApiCatalogNewEntryPage initialImageFile={imageFile} />;
}

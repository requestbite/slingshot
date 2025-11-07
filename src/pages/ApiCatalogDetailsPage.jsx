import { useState, useEffect, useRef } from 'preact/hooks';
import { Suspense, lazy } from 'preact/compat';
import { useRoute, useLocation } from 'wouter-preact';
import { usePageTitle } from '../hooks/usePageTitle';
import { ContextMenu } from '../components/common/ContextMenu';
import { BreadCrumbs } from '../components/common/BreadCrumbs';

// Dynamic import for URL import modal
const URLImportModal = lazy(() => import('../components/import/URLImportModal').then(m => ({ default: m.URLImportModal })));

export function ApiCatalogDetailsPage() {
  const [, params] = useRoute('/catalog/:uuid');
  const [, setLocation] = useLocation();
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImportContextMenu, setShowImportContextMenu] = useState(false);
  const [showURLImportModal, setShowURLImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const importButtonRef = useRef();

  usePageTitle(apiData?.name || 'API Details');

  useEffect(() => {
    if (params?.uuid) {
      loadApiDetails(params.uuid);
    }
  }, [params?.uuid]);

  const loadApiDetails = async (uuid) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_CATALOG_API}/v1/apis/${uuid}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API not found');
        }
        throw new Error(`Failed to fetch API details (status ${response.status})`);
      }

      const data = await response.json();
      setApiData(data);
    } catch (err) {
      console.error('Error loading API details:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportYaml = () => {
    if (apiData?.openApiYamlUrl) {
      setImportUrl(apiData.openApiYamlUrl);
      setShowImportContextMenu(false);
      setShowURLImportModal(true);
    }
  };

  const handleImportJson = () => {
    if (apiData?.openApiJsonUrl) {
      setImportUrl(apiData.openApiJsonUrl);
      setShowImportContextMenu(false);
      setShowURLImportModal(true);
    }
  };

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        {/* Main Container */}
        <div class="max-w-4xl mx-auto px-4">
          <div class="bg-white rounded-lg border border-gray-300">
            {/* Header Section */}
            <div class="sm:flex sm:items-start p-6">
              <div class="sm:flex-auto">
                {isLoading ? (
                  <div>
                    <BreadCrumbs
                      items={[
                        { name: 'Home', href: '/catalog' },
                        { name: 'Category' },
                        { name: '...' }
                      ]}
                      className="mb-3"
                    />
                    <div class="flex items-center space-x-3 text-gray-500">
                      <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Loading API details...</span>
                    </div>
                  </div>
                ) : error ? (
                  <div>
                    <BreadCrumbs
                      items={[
                        { name: 'Home', href: '/catalog' },
                        { name: 'Category' },
                        { name: 'Error' }
                      ]}
                      className="mb-3"
                    />
                    <h1 class="text-base/7 font-semibold text-gray-900">
                      Error Loading API
                    </h1>
                    <p class="mt-1 text-sm/6 text-red-600">
                      {error}
                    </p>
                  </div>
                ) : apiData ? (
                  <div>
                    <BreadCrumbs
                      items={[
                        { name: 'Home', href: '/catalog' },
                        { name: 'Category' },
                        { name: apiData.name }
                      ]}
                      className="mb-3"
                    />
                    <h1 class="text-base/7 font-semibold text-gray-900">
                      {apiData.name}
                    </h1>
                    {apiData.description && (
                      <p class="mt-1 text-sm/6 text-gray-600">
                        {apiData.description}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                <button
                  ref={importButtonRef}
                  onClick={() => setShowImportContextMenu(true)}
                  disabled={isLoading || error}
                  class="rounded-md bg-sky-100 hover:bg-sky-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed py-2 px-3 text-sm font-medium text-sky-700 flex items-center cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                    <path d="M12 15V3" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                  Import
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Section */}
            {!isLoading && !error && apiData && (
              <div class="py-6 sm:px-6">
                <div class="px-6 sm:p-0">
                  <dl class="divide-y divide-gray-200">
                    {/* API ID */}
                    <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt class="text-sm font-medium text-gray-500">API ID</dt>
                      <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-mono">
                        {apiData.id}
                      </dd>
                    </div>

                    {/* Version */}
                    {apiData.version && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Version</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {apiData.version}
                        </dd>
                      </div>
                    )}

                    {/* Service Name */}
                    {apiData.serviceName && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Service Name</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {typeof apiData.serviceName === 'object' ? apiData.serviceName.name : apiData.serviceName}
                        </dd>
                      </div>
                    )}

                    {/* Categories */}
                    {apiData.categories && apiData.categories.length > 0 && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Categories</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <div class="flex flex-wrap gap-2">
                            {apiData.categories.map((category) => (
                              <span
                                key={typeof category === 'object' ? category.id : category}
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800"
                              >
                                {typeof category === 'object' ? category.name : category}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </div>
                    )}

                    {/* Source */}
                    {apiData.source && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Source</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {apiData.source}
                        </dd>
                      </div>
                    )}

                    {/* Logo */}
                    {apiData.logoUrl && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Logo</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <img
                            src={apiData.logoUrl}
                            alt={`${apiData.name} logo`}
                            class="h-12 w-auto"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </dd>
                      </div>
                    )}

                    {/* Added Date */}
                    {apiData.addedTs && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Added</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {new Date(apiData.addedTs).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </dd>
                      </div>
                    )}

                    {/* Updated Date */}
                    {apiData.updatedTs && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {new Date(apiData.updatedTs).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Context Menu */}
      <ContextMenu
        isOpen={showImportContextMenu}
        onClose={() => setShowImportContextMenu(false)}
        trigger={importButtonRef.current}
        width={200}
        position="below"
        items={[
          {
            label: 'Import YAML spec',
            onClick: handleImportYaml,
            disabled: !apiData?.openApiYamlUrl,
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            )
          },
          {
            label: 'Import JSON spec',
            onClick: handleImportJson,
            disabled: !apiData?.openApiJsonUrl,
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            )
          }
        ]}
      />

      {/* URL Import Modal */}
      {showURLImportModal && (
        <Suspense fallback={null}>
          <URLImportModal
            isOpen={showURLImportModal}
            onClose={() => setShowURLImportModal(false)}
            onSuccess={(collection) => {
              console.log('Collection imported successfully:', collection);
            }}
            collectionName={apiData?.name}
            importUrl={importUrl}
          />
        </Suspense>
      )}
    </div>
  );
}

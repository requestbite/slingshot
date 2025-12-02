import { useState, useEffect, useRef } from 'preact/hooks';
import { Suspense, lazy } from 'preact/compat';
import { useRoute, useLocation, Link } from 'wouter-preact';
import { usePageTitle } from '../hooks/usePageTitle';
import { ContextMenu } from '../components/common/ContextMenu';
import { BreadCrumbs } from '../components/common/BreadCrumbs';
import { SearchAutocomplete } from '../components/common/SearchAutocomplete';
import { MarkdownPreview } from '../components/common/MarkdownPreview';

// Dynamic import for URL import modal
const URLImportModal = lazy(() => import('../components/import/URLImportModal').then(m => ({ default: m.URLImportModal })));

export function ApiCatalogDetailsPage() {
  const [, params] = useRoute('/catalog/api/:param1/:param2?/:param3?');
  const [, setLocation] = useLocation();
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImportContextMenu, setShowImportContextMenu] = useState(false);
  const [showURLImportModal, setShowURLImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const importButtonRef = useRef();
  const searchInputRef = useRef();

  usePageTitle(apiData?.name || 'Untitled API');

  useEffect(() => {
    if (params?.param1) {
      // Determine if this is new format (3 params) or old format (1 UUID param)
      if (params.param2 && params.param3) {
        // New format: /catalog/api/{providerKey}/{serviceKey}/{apiVersion}
        loadApiDetailsByKeys(params.param1, params.param2, params.param3);
      } else {
        // Old format: /catalog/api/{uuid}
        loadApiDetailsByUuid(params.param1);
      }
    }
  }, [params?.param1, params?.param2, params?.param3]);

  const loadApiDetailsByUuid = async (uuid) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_CATALOG_API}/v1/apis/${uuid}?resolveIds=true`
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

  const loadApiDetailsByKeys = async (providerKey, serviceKey, apiVersion) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_CATALOG_API}/v1/apis/resolveapi?providerKey=${encodeURIComponent(providerKey)}&serviceKey=${encodeURIComponent(serviceKey)}&apiVersion=${encodeURIComponent(apiVersion)}&resolveIds=true`
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleApiSearch = async (query) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_CATALOG_API}/v1/apis/search?q=${encodeURIComponent(query)}&resolveIds=true&fullDesc=false`
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching API search results:', error);
      return [];
    }
  };

  const handleApiSelect = (api) => {
    if (api && api.id) {
      setSearchQuery('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
      // Use new URL format if provider, serviceName, and version are available
      if (api.provider?.key && api.serviceName?.key && api.version) {
        setLocation(`/catalog/api/${api.provider.key}/${api.serviceName.key}/${api.version}`);
      } else {
        // Fallback to UUID format
        setLocation(`/catalog/api/${api.id}`);
      }
    }
  };

  const renderApiItem = (api) => {
    // Build title with region flag if available
    const apiTitle = api.serviceName?.regionFlag
      ? `${api.name} ${api.serviceName.regionFlag}`
      : api.name;

    return (
      <div class="flex flex-col gap-1">
        <div class="font-medium text-gray-900">{apiTitle}</div>
        <div class="text-xs text-gray-600">
          {api.description || 'No description available.'}
        </div>
      </div>
    );
  };

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        {/* Search Bar */}
        <div class="max-w-3xl mx-auto px-4 mb-[18px]">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-gray-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <SearchAutocomplete
              ref={searchInputRef}
              value={searchQuery}
              onChange={handleSearchChange}
              onSelect={handleApiSelect}
              onSearch={handleApiSearch}
              renderItem={renderApiItem}
              placeholder="Search APIs..."
              clearable={true}
              className="pl-10"
              emptyMessage="No APIs found"
              minChars={1}
              debounceMs={500}
            />
          </div>
        </div>

        {/* Main Container */}
        <div class="max-w-4xl mx-auto px-4">
          <div class="bg-white rounded-lg border border-gray-300">
            {/* Header Section */}
            <div class="p-6">
              {/* Breadcrumbs and Import Button Row */}
              <div class="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3">
                <div class="flex-1">
                  {isLoading ? (
                    <BreadCrumbs
                      items={[
                        { name: 'Home', href: '/catalog' },
                        { name: '...' }
                      ]}
                    />
                  ) : error ? (
                    <BreadCrumbs
                      items={[
                        { name: 'Home', href: '/catalog' },
                        { name: 'Error' }
                      ]}
                    />
                  ) : apiData ? (
                    <BreadCrumbs
                      items={[
                        { name: 'Home', href: '/catalog' },
                        ...(apiData.categories && apiData.categories.length > 0 ? [{
                          name: apiData.categories[0].name,
                          href: `/catalog/category/${apiData.categories[0].key}`
                        }] : []),
                        { name: apiData.name || 'Untitled API' }
                      ]}
                    />
                  ) : null}
                </div>
                <div class="sm:ml-4">
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

              {/* API Title and Description - Full Width */}
              {isLoading ? (
                <div class="flex items-center space-x-3 text-gray-500">
                  <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading API details...</span>
                </div>
              ) : error ? (
                <div>
                  <h1 class="text-base/7 font-semibold text-gray-900">
                    Error Loading API
                  </h1>
                  <p class="mt-1 text-sm/6 text-red-600">
                    {error}
                  </p>
                </div>
              ) : apiData ? (
                <div class={`flex ${apiData.logoUrl ? 'flex-col sm:flex-row gap-8' : ''}`}>
                  {apiData.logoUrl && (
                    <div class="flex-shrink-0">
                      <img
                        src={apiData.logoUrl}
                        alt={`${apiData.name || 'Untitled API'} logo`}
                        class="w-36 h-auto sm:w-20 mt-3"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div class="flex-1">
                    <h1 class="text-base/7 font-semibold text-gray-900 pt-4 sm:pt-0">
                      {apiData.name || 'Untitled API'}
                    </h1>
                    <div class="mt-1 text-sm/6 text-gray-600">
                      <MarkdownPreview markdown={apiData.description || 'No description available.'} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Content Section */}
            {!isLoading && !error && apiData && (
              <div class="pb-6 sm:px-6">
                <div class="px-6 sm:p-0">
                  <dl class="divide-y divide-gray-200">
                    {/* Version */}
                    {apiData.version && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Version</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {apiData.version}
                        </dd>
                      </div>
                    )}

                    {/* Categories */}
                    {apiData.categories && apiData.categories.length > 0 && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Categories</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <div class="flex flex-wrap gap-2">
                            {apiData.categories.map((category, idx) => (
                              <span key={typeof category === 'object' ? category.id : category}>
                                <Link
                                  href={`/catalog/category/${typeof category === 'object' ? category.key : category}`}
                                  class="text-sky-500 hover:text-sky-700 hover:underline"
                                >
                                  {typeof category === 'object' ? category.name : category}
                                </Link>
                                {idx < apiData.categories.length - 1 && (
                                  <span class="ml-2">&middot;</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </div>
                    )}

                    {/* Region */}
                    {apiData.serviceName?.regionKey && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Region</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          {apiData.serviceName.regionFlag} {apiData.serviceName.regionName}
                        </dd>
                      </div>
                    )}

                    {/* Documentation */}
                    {apiData.externalDocsUrl && (
                      <div class="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt class="text-sm font-medium text-gray-500">Documentation</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <a
                            href={apiData.externalDocsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-sky-500 hover:text-sky-700 hover:underline"
                          >
                            {apiData.externalDocsUrl}
                          </a>
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

                {/* Source Attribution */}
                {apiData.source === 'apis.guru' && (
                  <div class="px-6 sm:p-0 mt-4 pt-4">
                    <p class="text-gray-500">
                      API specs supplied by{' '}
                      <a
                        href="https://apis.guru"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sky-500 hover:text-sky-700 hover:underline"
                      >
                        APIs.guru
                      </a>.
                    </p>
                  </div>
                )}
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

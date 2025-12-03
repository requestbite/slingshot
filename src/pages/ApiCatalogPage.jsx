import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation, useRoute, Link } from 'wouter-preact';
import { usePageTitle } from '../hooks/usePageTitle';
import { SearchAutocomplete } from '../components/common/SearchAutocomplete';
import { ClickableCard } from '../components/common/ClickableCard';
import { Button } from '../components/common/Button';
import { BreadCrumbs } from '../components/common/BreadCrumbs';
import { Alert } from '../components/common/Alert';
import { Select } from '../components/common/Select';

export function ApiCatalogPage() {
  usePageTitle('API Catalog');
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/catalog/category/:key/:page?');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryApis, setCategoryApis] = useState([]);
  const [isLoadingApis, setIsLoadingApis] = useState(false);
  const [paginationDetails, setPaginationDetails] = useState(null);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const searchInputRef = useRef(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(() => {
    return localStorage.getItem('api-katalog-region') || '';
  });

  // Get current page from URL, default to 1
  const currentPage = params?.page ? parseInt(params.page, 10) : 1;

  // Check for success submission parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('submitted') === 'true') {
      setShowSuccessAlert(true);
      // Clean up URL by removing the parameter
      window.history.replaceState({}, '', '/catalog');
    }
  }, []);

  // Auto-focus the search input when the page loads
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Load categories from the API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const regionParam = selectedRegion ? `?region=${selectedRegion}` : '';
        const response = await fetch(
          `${import.meta.env.VITE_CATALOG_API}/v1/categories${regionParam}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch categories (status ${response.status})`);
        }

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [selectedRegion]);

  // Load regions from the API
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoadingRegions(true);
        const response = await fetch(
          `${import.meta.env.VITE_CATALOG_API}/v1/regions`
        );

        if (response.ok) {
          const data = await response.json();
          setRegions(data);
        }
      } catch (error) {
        console.error('Error fetching regions:', error);
      } finally {
        setLoadingRegions(false);
      }
    };

    fetchRegions();
  }, []);

  // Load APIs for a specific category
  useEffect(() => {
    if (!match || !params?.key) {
      return;
    }

    const loadCategoryApis = async () => {
      try {
        setIsLoadingApis(true);
        const regionParam = selectedRegion ? `&region=${selectedRegion}` : '';
        const response = await fetch(
          `${import.meta.env.VITE_CATALOG_API}/v1/categories/key/${params.key}/apis?limit=20&page=${currentPage}${regionParam}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch category APIs (status ${response.status})`);
        }

        const data = await response.json();
        setCategoryApis(data.apis || []);
        setPaginationDetails(data.paginationDetails || null);
        setCategoryInfo(data.category || null);
      } catch (error) {
        console.error('Error loading category APIs:', error);
        setCategoryApis([]);
        setPaginationDetails(null);
        setCategoryInfo(null);
      } finally {
        setIsLoadingApis(false);
      }
    };

    loadCategoryApis();
  }, [match, params?.key, currentPage, selectedRegion]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleRegionChange = (value) => {
    setSelectedRegion(value);
    localStorage.setItem('api-katalog-region', value);
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

  // Prepare region options for the Select component
  const regionOptions = [
    { value: '', label: 'All regions' },
    ...regions.map(region => ({
      value: region.key,
      label: region.flag ? `${region.name} ${region.flag}` : region.name
    }))
  ];

  // Helper component to render check/cross icon
  const SpecIcon = ({ available }) => (
    available ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-green-600 inline">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-600 inline">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  );

  // Helper function to render API details
  const renderApiDetails = (api) => (
    <div class="flex flex-col gap-2">
      <div class="line-clamp-2 text-xs text-gray-600">{api.description || 'No description available.'}</div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {api.version && (
          <span>Version: <span class="text-gray-700">{api.version}</span></span>
        )}
        {(api.openApiYamlUrl !== undefined || api.openApiJsonUrl !== undefined) && (
          <>
            <span>Has YAML spec: <SpecIcon available={!!api.openApiYamlUrl} /></span>
            <span>Has JSON spec: <SpecIcon available={!!api.openApiJsonUrl} /></span>
          </>
        )}
        {api.source && (
          <span>
            Source: {api.source === 'apis.guru' ? (
              <a href="https://apis.guru" target="_blank" rel="noopener noreferrer" class="text-sky-700 hover:text-sky-800 underline">
                {api.source}
              </a>
            ) : (
              <span class="text-gray-700">{api.source}</span>
            )}
          </span>
        )}
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {api.categories && api.categories.length > 0 && (
          <span>
            Categories: {api.categories.map((cat, idx) => (
              <span key={cat.key}>
                <Link href={`/catalog/category/${cat.key}`} class="text-sky-700 hover:text-sky-800 underline">
                  {cat.name}
                </Link>
                {idx < api.categories.length - 1 && ' / '}
              </span>
            ))}
          </span>
        )}
        {api.serviceName?.name && (
          <span>Service: <span class="text-gray-700">{api.serviceName.name}</span></span>
        )}
      </div>
    </div>
  );

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      if (newPage === 1) {
        setLocation(`/catalog/category/${params.key}`);
      } else {
        setLocation(`/catalog/category/${params.key}/${newPage}`);
      }
    }
  };

  const handleNextPage = () => {
    if (paginationDetails) {
      const totalPages = Math.ceil(paginationDetails.entries / paginationDetails.limit);
      if (currentPage < totalPages) {
        setLocation(`/catalog/category/${params.key}/${currentPage + 1}`);
      }
    } else {
      // Fallback: only allow next page if we got a full page of results (20 items)
      if (categoryApis.length === 20) {
        setLocation(`/catalog/category/${params.key}/${currentPage + 1}`);
      }
    }
  };

  // If we're on a category page, show the category APIs
  if (match && params?.key) {
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
              <div class="sm:flex sm:items-start p-6">
                <div class="sm:flex-auto">
                  <BreadCrumbs
                    items={[
                      { name: 'Home', href: '/catalog' },
                      { name: categoryInfo ? categoryInfo.name : params.key.charAt(0).toUpperCase() + params.key.slice(1) }
                    ]}
                    className="mb-3"
                  />
                  <h1 class="pt-2 text-base/7 font-semibold text-gray-900">
                    {categoryInfo ? `${categoryInfo.name} APIs` : `${params.key.charAt(0).toUpperCase() + params.key.slice(1)} APIs`}
                  </h1>
                  <p class="mt-1 text-sm/6 text-gray-600">
                    {categoryInfo ? categoryInfo.description : `Browse APIs in the ${params.key} category.`}
                    {paginationDetails && ` This category contains a total of ${paginationDetails.entries} APIs.`}
                  </p>
                  <div class="mt-6">
                    <Select
                      id="region-filter-category"
                      value={selectedRegion}
                      onChange={handleRegionChange}
                      options={regionOptions}
                      disabled={loadingRegions}
                      placeholder="All regions"
                    />
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div class="px-6 pb-6">
                {isLoadingApis ? (
                  <div class="flex items-center justify-center py-8 text-gray-500">
                    <svg class="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading APIs...</span>
                  </div>
                ) : categoryApis.length > 0 ? (
                  <div>
                    <div class="space-y-3">
                      {categoryApis.map((api) => {
                        // Generate URL using new format if data is available, otherwise fallback to UUID
                        const apiUrl = (api.provider?.key && api.serviceName?.key && api.version)
                          ? `/catalog/api/${api.provider.key}/${api.serviceName.key}/${api.version}`
                          : `/catalog/api/${api.id}`;

                        // Build title with region flag if available
                        const apiTitle = api.serviceName?.regionFlag
                          ? `${api.name || "Untitled API"} ${api.serviceName.regionFlag}`
                          : (api.name || "Untitled API");

                        return (
                          <ClickableCard
                            key={api.id}
                            href={apiUrl}
                            title={apiTitle}
                            description={renderApiDetails(api)}
                            icon={
                              <div class="flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                  <path d="M2 12h20" />
                                </svg>
                              </div>
                            }
                          />
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {paginationDetails ? (
                        <div class="text-sm text-gray-600 flex flex-col items-center gap-1">
                          <span>
                            Page {paginationDetails.page} of {Math.ceil(paginationDetails.entries / paginationDetails.limit)}
                          </span>
                          <span class="text-xs text-gray-500">
                            {((paginationDetails.page - 1) * paginationDetails.limit) + 1}-{Math.min(paginationDetails.page * paginationDetails.limit, paginationDetails.entries)} of {paginationDetails.entries} APIs
                          </span>
                        </div>
                      ) : (
                        <span class="text-sm text-gray-600">
                          Page {currentPage}
                        </span>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={paginationDetails ? currentPage >= Math.ceil(paginationDetails.entries / paginationDetails.limit) : categoryApis.length < 20}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div class="text-center py-8 text-gray-500">
                    No APIs found in this category
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default view - show categories
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
            <div class="sm:flex sm:items-start p-6">
              <div class="sm:flex-auto">
                <div class="flex items-center gap-2">
                  <h1 class="text-base/7 font-semibold text-gray-900">
                    REST API Catalog
                  </h1>
                  <span class="px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                    Beta
                  </span>
                </div>
                <p class="mt-1 text-sm/6 text-gray-600">
                  Explore the vast number of REST APIs in the RequestBite API catalog.
                </p>
              </div>
              <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                <Button
                  onClick={() => setLocation('/catalog/edit')}
                  type="button"
                  variant="primary"
                  size="md"
                  className="block text-center"
                >
                  Add API
                </Button>
              </div>
            </div>

            {/* Success Alert */}
            {showSuccessAlert && (
              <div class="px-6 pb-4">
                <Alert type="tip">
                  <strong>Thanks!</strong> You have successfully submitted your proposal to the RequestBite API catalog.
                </Alert>
              </div>
            )}

            {/* Content Section */}
            <div class="px-6 pb-6">
                <div class="mb-6">
                  <Select
                    id="region-filter-main"
                    value={selectedRegion}
                    onChange={handleRegionChange}
                    options={regionOptions}
                    disabled={loadingRegions}
                    placeholder="All regions"
                  />
                </div>
              {isLoadingCategories ? (
                <div class="flex items-center justify-center py-8 text-gray-500">
                  <svg class="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading categories...</span>
                </div>
              ) : categories.length > 0 ? (
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.filter((category) => category.apis > 0).map((category) => (
                    <ClickableCard
                      key={category.id}
                      href={`/catalog/category/${category.key}`}
                      title={category.name}
                      description={
                        <div>
                          <div class="line-clamp-3 mb-2">{category.description}</div>
                          <div class="text-xs text-gray-500">APIs: {category.apis}</div>
                        </div>
                      }
                      icon={
                        <div class="flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500">
                            <path d="m16 18 6-6-6-6" />
                            <path d="m8 6-6 6 6 6" />
                          </svg>
                        </div>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div class="text-center py-8 text-gray-500">
                  No categories found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

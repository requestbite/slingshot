import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { usePageTitle } from '../hooks/usePageTitle';
import { SearchAutocomplete } from '../components/common/SearchAutocomplete';
import { ClickableCard } from '../components/common/ClickableCard';

export function ApiCatalogPage() {
  usePageTitle('API Catalog');
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Auto-focus the search input when the page loads
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

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
      setLocation(`/catalog/${api.id}`);
    }
  };

  const renderApiItem = (api) => (
    <div class="flex flex-col gap-1">
      <div class="font-medium text-gray-900">{api.name}</div>
      {api.description && (
        <div class="text-xs text-gray-600">{api.description}</div>
      )}
    </div>
  );

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
                <h1 class="text-base/7 font-semibold text-gray-900">
                  API Catalog
                </h1>
                <p class="mt-1 text-sm/6 text-gray-600">
                  Browse and manage your API catalog.
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div class="px-6 pb-6">
              <ClickableCard
                href="/catalog/example-api"
                title="Stripe Payment API"
                description="Accept payments, send payouts, and manage your business online with a complete payments platform designed for developers."
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m16 18 6-6-6-6" />
                    <path d="m8 6-6 6 6 6" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

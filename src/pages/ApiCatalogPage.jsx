import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { usePageTitle } from '../hooks/usePageTitle';
import { SearchAutocomplete } from '../components/common/SearchAutocomplete';
import { ClickableCard } from '../components/common/ClickableCard';

export function ApiCatalogPage() {
  usePageTitle('API Catalog');
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const searchInputRef = useRef(null);

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
        const response = await fetch(
          `${import.meta.env.VITE_CATALOG_API}/v1/categories`
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
                  REST API Catalog
                </h1>
                <p class="mt-1 text-sm/6 text-gray-600">
                  Explore the vast number of REST APIs in the RequestBite API catalog.
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div class="px-6 pb-6">
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
                  {categories.map((category) => (
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
                        <div class="border border-sky-700 rounded-full p-1 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sky-700">
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

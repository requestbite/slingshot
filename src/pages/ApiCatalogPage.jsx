import { useState } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { TextInput } from '../components/common/TextInput';

export function ApiCatalogPage() {
  usePageTitle('API Catalog');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
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
            <TextInput
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search APIs..."
              clearable={true}
              className="pl-10"
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
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { SearchAutocomplete } from '../components/common/SearchAutocomplete';

export function ApiCatalogPage() {
  usePageTitle('API Catalog');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Replace with actual API data from your backend
  const mockApiData = [
    { id: 1, name: 'Users API', description: 'Manage user accounts and profiles', endpoint: '/api/users' },
    { id: 2, name: 'Authentication API', description: 'Handle login, logout, and token management', endpoint: '/api/auth' },
    { id: 3, name: 'Products API', description: 'Product catalog and inventory management', endpoint: '/api/products' },
    { id: 4, name: 'Orders API', description: 'Order processing and tracking', endpoint: '/api/orders' },
    { id: 5, name: 'Payments API', description: 'Payment processing and transactions', endpoint: '/api/payments' },
    { id: 6, name: 'Analytics API', description: 'Usage analytics and reporting', endpoint: '/api/analytics' },
    { id: 7, name: 'Notifications API', description: 'Email and push notification services', endpoint: '/api/notifications' },
    { id: 8, name: 'File Storage API', description: 'Upload and manage files and media', endpoint: '/api/storage' },
    { id: 9, name: 'Search API', description: 'Full-text search across resources', endpoint: '/api/search' },
    { id: 10, name: 'Webhooks API', description: 'Manage webhook subscriptions and events', endpoint: '/api/webhooks' },
  ];

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleApiSelect = (api) => {
    console.log('Selected API:', api);
    // TODO: Implement navigation or action when API is selected
    // For example: navigate to API detail page, or populate a form
  };

  const renderApiItem = (api) => (
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <span class="font-medium text-gray-900">{api.name}</span>
        <span class="text-xs text-gray-500 font-mono">{api.endpoint}</span>
      </div>
      {api.description && (
        <span class="text-xs text-gray-600">{api.description}</span>
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
              value={searchQuery}
              onChange={handleSearchChange}
              onSelect={handleApiSelect}
              items={mockApiData}
              renderItem={renderApiItem}
              placeholder="Search APIs..."
              clearable={true}
              className="pl-10"
              emptyMessage="No APIs found"
              minChars={1}
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

import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { SearchAutocomplete } from './SearchAutocomplete';

export default {
  title: 'Common/SearchAutocomplete',
  component: SearchAutocomplete,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

// Sample data
const fruits = [
  'Apple', 'Apricot', 'Avocado',
  'Banana', 'Blackberry', 'Blueberry',
  'Cherry', 'Coconut', 'Cranberry',
  'Date', 'Dragonfruit',
  'Elderberry',
  'Fig',
  'Grape', 'Grapefruit', 'Guava',
  'Kiwi',
  'Lemon', 'Lime',
  'Mango', 'Melon',
  'Orange',
  'Papaya', 'Peach', 'Pear', 'Pineapple', 'Plum', 'Pomegranate',
  'Raspberry',
  'Strawberry',
  'Tangerine',
  'Watermelon',
];

const apiData = [
  { id: 1, name: 'Users API', description: 'Manage user accounts and profiles', endpoint: '/api/users', method: 'GET' },
  { id: 2, name: 'Authentication API', description: 'Handle login, logout, and token management', endpoint: '/api/auth', method: 'POST' },
  { id: 3, name: 'Products API', description: 'Product catalog and inventory management', endpoint: '/api/products', method: 'GET' },
  { id: 4, name: 'Orders API', description: 'Order processing and tracking', endpoint: '/api/orders', method: 'GET' },
  { id: 5, name: 'Payments API', description: 'Payment processing and transactions', endpoint: '/api/payments', method: 'POST' },
  { id: 6, name: 'Analytics API', description: 'Usage analytics and reporting', endpoint: '/api/analytics', method: 'GET' },
  { id: 7, name: 'Notifications API', description: 'Email and push notification services', endpoint: '/api/notifications', method: 'POST' },
  { id: 8, name: 'File Storage API', description: 'Upload and manage files and media', endpoint: '/api/storage', method: 'POST' },
  { id: 9, name: 'Search API', description: 'Full-text search across resources', endpoint: '/api/search', method: 'GET' },
  { id: 10, name: 'Webhooks API', description: 'Manage webhook subscriptions and events', endpoint: '/api/webhooks', method: 'POST' },
];

const countries = [
  { code: 'US', name: 'United States', continent: 'North America' },
  { code: 'CA', name: 'Canada', continent: 'North America' },
  { code: 'MX', name: 'Mexico', continent: 'North America' },
  { code: 'BR', name: 'Brazil', continent: 'South America' },
  { code: 'AR', name: 'Argentina', continent: 'South America' },
  { code: 'GB', name: 'United Kingdom', continent: 'Europe' },
  { code: 'FR', name: 'France', continent: 'Europe' },
  { code: 'DE', name: 'Germany', continent: 'Europe' },
  { code: 'IT', name: 'Italy', continent: 'Europe' },
  { code: 'ES', name: 'Spain', continent: 'Europe' },
  { code: 'JP', name: 'Japan', continent: 'Asia' },
  { code: 'CN', name: 'China', continent: 'Asia' },
  { code: 'IN', name: 'India', continent: 'Asia' },
  { code: 'AU', name: 'Australia', continent: 'Oceania' },
];

// Basic example with simple string array
export const BasicStringArray = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(null);

      return (
        <div class="w-[400px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Search Fruits
            </label>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(item) => {
                setSelected(item);
                setQuery(item);
              }}
              items={fruits}
              placeholder="Type to search fruits..."
              clearable={true}
            />
          </div>
          {selected && (
            <div class="text-sm text-gray-600">
              Selected: <span class="font-medium">{selected}</span>
            </div>
          )}
        </div>
      );
    };

    return <Example />;
  },
};

// Custom rendering with complex objects
export const CustomRendering = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(null);

      const renderApiItem = (api) => (
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="font-medium text-gray-900">{api.name}</span>
            <span class="text-xs text-gray-500 font-mono">{api.endpoint}</span>
          </div>
          {api.description && (
            <span class="text-xs text-gray-600">{api.description}</span>
          )}
          <div class="flex items-center gap-2 mt-1">
            <span class={`text-xs px-1.5 py-0.5 rounded font-medium ${
              api.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {api.method}
            </span>
          </div>
        </div>
      );

      return (
        <div class="w-[500px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Search APIs
            </label>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(api) => {
                setSelected(api);
                setQuery(api.name);
              }}
              items={apiData}
              renderItem={renderApiItem}
              placeholder="Search APIs..."
              clearable={true}
            />
          </div>
          {selected && (
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded-sm">
              <div class="font-medium mb-1">Selected API:</div>
              <div><strong>Name:</strong> {selected.name}</div>
              <div><strong>Endpoint:</strong> {selected.endpoint}</div>
              <div><strong>Method:</strong> {selected.method}</div>
            </div>
          )}
        </div>
      );
    };

    return <Example />;
  },
};

// With search icon
export const WithSearchIcon = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('');

      return (
        <div class="w-[400px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Search with Icon
            </label>
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onSelect={(item) => setQuery(item)}
                items={fruits}
                placeholder="Search fruits..."
                clearable={true}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Asynchronous search with loading state
export const AsynchronousSearch = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(null);

      // Simulate an async search
      const handleSearch = async (searchQuery) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Filter countries based on search query
        const results = countries.filter(country =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.code.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return results;
      };

      const renderCountryItem = (country) => (
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded-sm">
              {country.code}
            </span>
            <span class="font-medium">{country.name}</span>
          </div>
          <span class="text-xs text-gray-500">{country.continent}</span>
        </div>
      );

      return (
        <div class="w-[500px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Search Countries (Async)
            </label>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(country) => {
                setSelected(country);
                setQuery(country.name);
              }}
              onSearch={handleSearch}
              renderItem={renderCountryItem}
              placeholder="Type to search countries..."
              clearable={true}
              emptyMessage="No countries found"
            />
          </div>
          {selected && (
            <div class="text-sm text-gray-600">
              Selected: <span class="font-medium">{selected.name} ({selected.code})</span>
            </div>
          )}
        </div>
      );
    };

    return <Example />;
  },
};

// With custom configuration
export const CustomConfiguration = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('');

      return (
        <div class="w-[400px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Custom Configuration
            </label>
            <p class="text-xs text-gray-500 mb-2">
              Min 3 chars, max 5 results, 500ms debounce
            </p>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(item) => setQuery(item)}
              items={fruits}
              placeholder="Type at least 3 characters..."
              clearable={true}
              minChars={3}
              maxResults={5}
              debounceMs={500}
              emptyMessage="No fruits match your search"
            />
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Empty state example
export const EmptyState = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('xyz');

      return (
        <div class="w-[400px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              No Results Example
            </label>
            <p class="text-xs text-gray-500 mb-2">
              Try searching for "xyz" to see empty state
            </p>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(item) => setQuery(item)}
              items={fruits}
              placeholder="Search fruits..."
              clearable={true}
              emptyMessage="No fruits found matching your search"
            />
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Disabled state
export const Disabled = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('Apple');

      return (
        <div class="w-[400px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Disabled State
            </label>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(item) => setQuery(item)}
              items={fruits}
              placeholder="Search fruits..."
              clearable={true}
              disabled={true}
            />
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Without clear button
export const NoClearButton = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('');

      return (
        <div class="w-[400px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Without Clear Button
            </label>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(item) => setQuery(item)}
              items={fruits}
              placeholder="Search fruits..."
              clearable={false}
            />
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Realistic API Catalog example
export const ApiCatalogExample = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(null);

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
        <div class="w-[600px] p-4 bg-gray-100">
          <div class="mb-4">
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onSelect={(api) => {
                  setSelected(api);
                  console.log('Selected API:', api);
                }}
                items={apiData}
                renderItem={renderApiItem}
                placeholder="Search APIs..."
                clearable={true}
                className="pl-10"
                emptyMessage="No APIs found"
              />
            </div>
          </div>

          {selected && (
            <div class="bg-white rounded-lg border border-gray-300 p-4">
              <h3 class="text-base font-semibold text-gray-900 mb-2">
                {selected.name}
              </h3>
              <p class="text-sm text-gray-600 mb-3">
                {selected.description}
              </p>
              <div class="flex items-center gap-4 text-sm">
                <div>
                  <span class="text-gray-500">Endpoint:</span>{' '}
                  <span class="font-mono text-gray-900">{selected.endpoint}</span>
                </div>
                <div>
                  <span class={`px-2 py-1 rounded text-xs font-medium ${
                    selected.method === 'GET'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selected.method}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return <Example />;
  },
};

// Keyboard navigation demo
export const KeyboardNavigation = {
  render: () => {
    const Example = () => {
      const [query, setQuery] = useState('a');

      return (
        <div class="w-[400px] p-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Keyboard Navigation
            </label>
            <div class="text-xs text-gray-600 mb-3 space-y-1">
              <div><kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded-sm text-xs">↑</kbd> / <kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded-sm text-xs">↓</kbd> Navigate items</div>
              <div><kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded-sm text-xs">Enter</kbd> Select highlighted item</div>
              <div><kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded-sm text-xs">Esc</kbd> Close dropdown</div>
              <div><kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded-sm text-xs">Tab</kbd> Close and move to next field</div>
            </div>
            <SearchAutocomplete
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSelect={(item) => setQuery(item)}
              items={fruits}
              placeholder="Try keyboard navigation..."
              clearable={true}
            />
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

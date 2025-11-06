import { usePageTitle } from '../hooks/usePageTitle';

export function ApiCatalogPage() {
  usePageTitle('API Catalog');

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
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

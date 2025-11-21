import { usePageTitle } from '../hooks/usePageTitle';

export function ApiCatalogEditPage() {
  usePageTitle('Edit Catalog');

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
                  Edit Catalog
                </h1>
                <p class="mt-1 text-sm/6 text-gray-600">
                  Use this wizard to add or edit a catalog entry.
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div class="py-6 sm:px-6">
              {/* Content will be added later */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

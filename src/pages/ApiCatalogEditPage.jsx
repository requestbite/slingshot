import { useState } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { TextInput } from '../components/common/TextInput';
import { Label } from '../components/common/Label';
import { Button } from '../components/common/Button';

export function ApiCatalogEditPage() {
  usePageTitle('Edit Catalog');

  // Form state
  const [openapiUrl, setOpenapiUrl] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  // Validate URL format
  const isValidUrl = (url) => {
    if (!url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle URL input change
  const handleUrlChange = (e) => {
    setOpenapiUrl(e.target.value);
  };

  // Handle Test button click
  const handleTestUrl = () => {
    // Test functionality will be added later
    console.log('Testing URL:', openapiUrl);
  };

  // Handle Next button click
  const handleNext = () => {
    // Next functionality will be added later
    console.log('Proceeding to next step');
  };

  const isUrlValid = isValidUrl(openapiUrl);
  const canTest = isUrlValid && !isTestingUrl;
  const canProceed = false; // Disabled for now

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
              <div class="space-y-8">
                <div class="border-b border-gray-900/10 pb-8">
                  <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">

                    {/* OpenAPI URL Input */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="openapi-url">URL to OpenAPI spec</Label>
                      <div class="flex gap-2">
                        <TextInput
                          id="openapi-url"
                          type="url"
                          value={openapiUrl}
                          onInput={handleUrlChange}
                          placeholder="https://api.example.com/openapi.json"
                        />
                        <Button
                          type="button"
                          onClick={handleTestUrl}
                          disabled={!canTest}
                          variant="primary"
                        >
                          {isTestingUrl ? 'Testing...' : 'Test'}
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div class="mt-6 px-6 pb-6 flex items-center justify-end">
              <Button
                onClick={handleNext}
                type="button"
                disabled={!canProceed}
                variant="primary"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

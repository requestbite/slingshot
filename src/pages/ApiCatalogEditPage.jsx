import { useState } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { TextInput } from '../components/common/TextInput';
import { Label } from '../components/common/Label';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { fetchFromURL, detectContentFormat } from '../utils/urlImporter';

export function ApiCatalogEditPage() {
  usePageTitle('Edit Catalog');

  // Form state
  const [openapiUrl, setOpenapiUrl] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testError, setTestError] = useState(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState(null);

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
    // Clear test results when URL changes
    setTestError(null);
    setTestSuccessMessage(null);
  };

  // Handle Test button click
  const handleTestUrl = async () => {
    // Clear previous test results
    setTestError(null);
    setTestSuccessMessage(null);
    setIsTestingUrl(true);

    try {
      // Create a 10-second timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
      });

      // Fetch content from URL with 10-second timeout
      const { content } = await Promise.race([
        fetchFromURL(openapiUrl),
        timeoutPromise
      ]);

      // Detect content format
      const format = detectContentFormat(content);

      if (format !== 'openapi') {
        setTestError('The provided URL does not seem to point to a valid OpenAPI spec');
        return;
      }

      // Parse the content (try JSON first, then YAML)
      let spec;
      try {
        spec = JSON.parse(content);
      } catch {
        // If JSON parsing fails, try parsing as YAML
        const yaml = await import('js-yaml');
        spec = yaml.load(content);
      }

      // Validate required OpenAPI fields
      const openapiVersion = spec.openapi || spec.swagger;
      const title = spec.info?.title;
      const apiVersion = spec.info?.version;

      if (!openapiVersion || !title || !apiVersion) {
        setTestError('The provided URL does not seem to point to a valid OpenAPI spec');
        return;
      }

      // Success - set success message
      setTestSuccessMessage(`Found version ${apiVersion} of API "${title}"`);

    } catch (error) {
      console.error('URL test error:', error);
      setTestError('The provided URL does not seem to point to a valid OpenAPI spec');
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Handle Next button click
  const handleNext = () => {
    // Next functionality will be added later
    console.log('Proceeding to next step');
  };

  const isUrlValid = isValidUrl(openapiUrl);
  const canTest = isUrlValid && !isTestingUrl;
  const canProceed = testSuccessMessage !== null; // Enable when test succeeds

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
            <div class="py-6 px-6">
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

                      {/* Test Error Alert */}
                      {testError && (
                        <div class="mt-3">
                          <Alert type="caution">
                            {testError}
                          </Alert>
                        </div>
                      )}

                      {/* Test Success Alert */}
                      {testSuccessMessage && (
                        <div class="mt-3">
                          <Alert type="tip">
                            {testSuccessMessage}
                          </Alert>
                        </div>
                      )}
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

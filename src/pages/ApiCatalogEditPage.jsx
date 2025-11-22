import { useState } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { useLocation } from 'wouter-preact';
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

  // Generate UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Sanitize string to only contain 0-9, a-z, -, .
  const sanitize = (str, toLowerCase = false) => {
    if (!str) return '';
    let sanitized = toLowerCase ? str.toLowerCase() : str;
    sanitized = sanitized.replace(/[^0-9a-z.\-]/gi, '');
    return sanitized;
  };

  // Generate provider from server URL (extract top-level domain)
  const generateProvider = (serverUrl) => {
    if (!serverUrl) return generateUUID();

    try {
      // Parse the URL to get the hostname
      const url = new URL(serverUrl);
      const hostname = url.hostname;

      // Extract top-level domain (last two parts of the domain)
      const parts = hostname.split('.');
      const topLevelDomain = parts.length >= 2
        ? parts.slice(-2).join('.')
        : hostname;

      // Sanitize (keep only 0-9, a-z, -, .)
      const provider = sanitize(topLevelDomain);

      // If empty after sanitization, generate UUID
      return provider || generateUUID();
    } catch {
      // If URL parsing fails, generate UUID
      return generateUUID();
    }
  };

  // Generate service name from API name
  const generateServiceName = (name) => {
    if (!name) return generateUUID();

    // Replace spaces with dashes, make lowercase, and sanitize
    let serviceName = name.replace(/\s+/g, '-').toLowerCase();
    serviceName = sanitize(serviceName);

    // If empty after sanitization, generate UUID
    return serviceName || generateUUID();
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
        setTestError('The provided URL does not seem to point to a valid OpenAPI spec.');
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
      const description = spec.info?.description || null;
      const externalDocsUrl = spec.externalDocs?.url || null;
      const serverUrl = spec.servers?.[0]?.url;

      // Check for mandatory fields
      if (!openapiVersion || !title || !apiVersion || !serverUrl) {
        setTestError('Mandatory details are missing to add the API (perhaps corrupt OpenAPI spec).');
        return;
      }

      // Generate provider and serviceName
      let provider = generateProvider(serverUrl);
      let serviceName = generateServiceName(title);

      // Check if URL is already in the catalog
      try {
        const catalogResponse = await fetch(
          `${import.meta.env.VITE_CATALOG_API}/v1/apis/specurl?url=${encodeURIComponent(openapiUrl)}`
        );

        if (catalogResponse.status === 200) {
          // URL already exists in catalog
          setTestError('The provided OpenAPI spec URL is already added to the catalog.');
          return;
        } else if (catalogResponse.status !== 404) {
          // Unexpected status code
          console.error('Unexpected catalog API response status:', catalogResponse.status);
          setTestError('Unable to verify if the URL is in the catalog. Please try again.');
          return;
        }
        // 404 is OK - URL not in catalog yet
      } catch (catalogError) {
        console.error('Error checking catalog:', catalogError);
        setTestError('Unable to verify if the URL is in the catalog. Please try again.');
        return;
      }

      // Check for provider/service collision
      try {
        const providerServicesResponse = await fetch(
          `${import.meta.env.VITE_CATALOG_API}/v1/providers/key/${provider}/services`
        );

        if (providerServicesResponse.status === 200) {
          // Provider exists, check for service name collision
          const providerData = await providerServicesResponse.json();
          const existingServiceKeys = providerData.services?.map(s => s.key) || [];

          if (existingServiceKeys.includes(serviceName)) {
            // Collision detected, generate UUID for serviceName
            serviceName = generateUUID();
          }
        } else if (providerServicesResponse.status !== 404) {
          // Unexpected status code
          console.error('Unexpected provider services API response status:', providerServicesResponse.status);
          setTestError('Unable to verify provider/service information. Please try again.');
          return;
        }
        // 404 is OK - provider doesn't exist yet
      } catch (providerError) {
        console.error('Error checking provider services:', providerError);
        setTestError('Unable to verify provider/service information. Please try again.');
        return;
      }

      // Create draft entry for localStorage
      const apiCatDraftEntry = {
        name: title,
        version: apiVersion,
        description: description,
        url: openapiUrl,
        urlExtDoc: externalDocsUrl,
        provider: provider,
        serviceName: serviceName,
        categories: [],
        source: 'API provider',
        region: null
      };

      // Store in localStorage
      localStorage.setItem('api-catalog-draft-entry', JSON.stringify(apiCatDraftEntry));

      // Success message
      setTestSuccessMessage(`Found version ${apiVersion} of API "${title}". You may now proceed to add it to the catalog.`);

    } catch (error) {
      console.error('URL test error:', error);
      setTestError('The provided URL does not seem to point to a valid OpenAPI spec.');
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Handle Next button click
  const [, navigate] = useLocation();
  const handleNext = () => {
    navigate('/catalog/edit/new');
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

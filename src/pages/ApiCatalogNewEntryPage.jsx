import { useState, useEffect } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { TextInput } from '../components/common/TextInput';
import { Label } from '../components/common/Label';
import { Select } from '../components/common/Select';
import { Button } from '../components/common/Button';
import { MarkdownPreview } from '../components/common/MarkdownPreview';
import { Alert } from '../components/common/Alert';
import { ApiCatalogSubmitModal } from '../components/modals/ApiCatalogSubmitModal';
import { ImageViewer } from '../components/common/ImageViewer';

export function ApiCatalogNewEntryPage() {
  usePageTitle('Add Catalog Entry');

  // Form state from localStorage
  const [formData, setFormData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [showReadOnlyData, setShowReadOnlyData] = useState(false);

  // Load draft entry from localStorage
  useEffect(() => {
    const draftEntry = localStorage.getItem('api-catalog-draft-entry');
    if (draftEntry) {
      try {
        const data = JSON.parse(draftEntry);
        setFormData(data);
      } catch (err) {
        console.error('Failed to parse draft entry:', err);
        setError('Failed to load draft entry. Please go back and try again.');
      }
    } else {
      setError('No draft entry found. Please go back and test a URL first.');
    }
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CATALOG_API}/v1/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          console.error('Failed to fetch categories:', response.status);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch regions
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CATALOG_API}/v1/regions`);
        if (response.ok) {
          const data = await response.json();
          setRegions(data);
        } else {
          console.error('Failed to fetch regions:', response.status);
        }
      } catch (err) {
        console.error('Error fetching regions:', err);
      } finally {
        setLoadingRegions(false);
      }
    };

    fetchRegions();
  }, []);

  // Update localStorage whenever formData changes
  useEffect(() => {
    if (formData) {
      localStorage.setItem('api-catalog-draft-entry', JSON.stringify(formData));
    }
  }, [formData]);

  // Handle field updates
  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle image file selection
  const handleImageChange = (file) => {
    if (!file) {
      setImageFile(null);
      setError(null);
      return;
    }

    // Validate file size (15MB max)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image file size must not exceed 15 MB');
      setImageFile(null);
      return;
    }

    setImageFile(file);
    setError(null);
  };

  // Validate all mandatory fields are filled
  const isFormValid = () => {
    if (!formData) return false;

    return (
      formData.name && formData.name.trim() !== '' &&
      formData.version && formData.version.trim() !== '' &&
      formData.categories && formData.categories.length > 0 &&
      formData.region !== undefined && // Can be null for "Global"
      formData.provider && formData.provider.trim() !== '' &&
      formData.serviceName && formData.serviceName.trim() !== '' &&
      formData.source && formData.source.trim() !== ''
    );
  };

  if (error) {
    return (
      <div class="h-full bg-gray-100 overflow-y-auto">
        <div class="min-h-full pt-[83px] pb-6">
          <div class="max-w-4xl mx-auto px-4">
            <Alert type="caution">{error}</Alert>
          </div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div class="h-full bg-gray-100 overflow-y-auto">
        <div class="min-h-full pt-[83px] pb-6">
          <div class="max-w-4xl mx-auto px-4">
            <p class="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare category options
  const categoryOptions = categories.map(cat => ({
    value: cat.key,
    label: cat.name
  }));

  // Prepare region options
  const regionOptions = [
    { value: null, label: 'Global' },
    ...regions.map(region => ({
      value: region.key,
      label: region.name
    }))
  ];

  // Source options
  const sourceOptions = [
    { value: 'api-provider', label: 'API provider' },
    { value: 'community', label: 'Community' }
  ];

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
                  Add Catalog Entry
                </h1>
                <p class="mt-1 text-sm/6 text-gray-600">
                  Use the form below to propose a new entry to the API catalog.
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div class="pt-2 pb-6 px-6">
              <div class="space-y-8">
                <div class="border-b border-gray-900/10 pb-8">
                  <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">

                    {/* Logo */}
                    <div class="sm:col-span-6">
                      <Label htmlFor="image">Logo</Label>
                      <div class="mt-2">
                        <ImageViewer
                          value={imageFile}
                          onChange={handleImageChange}
                        />
                        <p class="mt-1 text-xs text-gray-500">
                          Upload a logo or icon for the API (max 15 MB)
                        </p>
                      </div>
                    </div>

                    {/* Name */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="name" mandatory={true}>Name</Label>
                      <TextInput
                        id="name"
                        type="text"
                        value={formData.name}
                        onInput={(e) => updateField('name', e.target.value)}
                        description="Required name for the catalog entry."
                      />
                    </div>

                    {/* Description - Two column section (full width) */}
                    <div class="sm:col-span-6">
                      <Label
                        htmlFor="description"
                        description="Description in Common Markdown. Fetched from OpenAPI spec."
                      >Description</Label>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: Textarea */}
                        <div>
                          <TextInput
                            id="description"
                            type="textarea"
                            value={formData.description || ''}
                            onInput={(e) => updateField('description', e.target.value)}
                            rows={10}
                            placeholder="Enter description in Markdown format..."
                          />
                        </div>
                        {/* Right: Markdown Preview */}
                        <div class="border border-gray-300 rounded-md p-3 bg-gray-50">
                          <MarkdownPreview markdown={formData.description || ''} />
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="category" mandatory={true}>Category</Label>
                      <Select
                        id="category"
                        value={formData.categories[0] || ''}
                        onChange={(value) => updateField('categories', value ? [value] : [])}
                        options={categoryOptions}
                        disabled={loadingCategories}
                        placeholder="Select a category..."
                        description="Mandatory category for the API."
                      />
                    </div>

                    {/* Region */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="region" mandatory={true}>Region</Label>
                      <Select
                        id="region"
                        value={formData.region || ''}
                        onChange={(value) => updateField('region', value || null)}
                        options={regionOptions}
                        disabled={loadingRegions}
                        placeholder="Select a region..."
                        description='Only pick a region other than "Global" if the API is clearly targeting a specific country.'
                      />
                    </div>

                    {/* External Documentation */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="external-docs">External documentation</Label>
                      <TextInput
                        id="external-docs"
                        type="url"
                        value={formData.urlExtDoc || ''}
                        onInput={(e) => updateField('urlExtDoc', e.target.value)}
                        placeholder="https://docs.example.com"
                        description="Optional URL to external documentation for API."
                      />
                    </div>

                    {/* Source */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="source" mandatory={true}>Source</Label>
                      <Select
                        id="source"
                        value={formData.source}
                        onChange={(value) => updateField('source', value)}
                        options={sourceOptions}
                        description="Select if spec is offered by API provider, or if it is a community effort."
                      />
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Data Section */}
            <div class="px-6">
              <div class="mb-4">
                <Button
                  onClick={() => setShowReadOnlyData(!showReadOnlyData)}
                  variant="none"
                  className="flex items-center text-sm font-medium text-gray-700 cursor-pointer"
                >
                  <svg
                    class={`h-4 w-4 mr-1 transition-transform duration-200 ${showReadOnlyData ? 'rotate-90' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                  </svg>
                  Read-Only Data
                </Button>
              </div>

              {showReadOnlyData && (
                <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                  {/* Version (read-only) */}
                  <div class="sm:col-span-4">
                    <Label htmlFor="version" mandatory={true}>Version</Label>
                    <TextInput
                      id="version"
                      type="text"
                      value={formData.version}
                      disabled={true}
                      description="Fetched from OpenAPI spec. Cannot be updated."
                    />
                  </div>

                  {/* Provider (read-only) */}
                  <div class="sm:col-span-4">
                    <Label htmlFor="provider" mandatory={true}>Provider</Label>
                    <TextInput
                      id="provider"
                      type="text"
                      value={formData.provider}
                      disabled={true}
                      description="Generated from OpenAPI spec. Cannot be updated."
                    />
                  </div>

                  {/* Service (read-only) */}
                  <div class="sm:col-span-4">
                    <Label htmlFor="service" mandatory={true}>Service</Label>
                    <TextInput
                      id="service"
                      type="text"
                      value={formData.serviceName}
                      disabled={true}
                      description="Generated from OpenAPI spec. Cannot be updated."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div class="mt-6 px-6 pb-6 flex items-center justify-end">
              <Button
                onClick={() => setIsSubmitModalOpen(true)}
                type="button"
                disabled={!isFormValid()}
                variant="primary"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      <ApiCatalogSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        imageFile={imageFile}
      />
    </div>
  );
}

import { useState, useEffect } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { TextInput } from '../components/common/TextInput';
import { Label } from '../components/common/Label';
import { Select } from '../components/common/Select';
import { MarkdownPreview } from '../components/common/MarkdownPreview';
import { Alert } from '../components/common/Alert';

export function ApiCatalogNewEntryPage() {
  usePageTitle('Add Catalog Entry');

  // Form state from localStorage
  const [formData, setFormData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [error, setError] = useState(null);

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
    { value: 'API provider', label: 'API provider' },
    { value: 'Community', label: 'Community' }
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
            <div class="py-6 px-6">
              <div class="space-y-8">
                <div class="border-b border-gray-900/10 pb-8">
                  <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">

                    {/* Name */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="name">Name</Label>
                      <TextInput
                        id="name"
                        type="text"
                        value={formData.name}
                        onInput={(e) => updateField('name', e.target.value)}
                      />
                    </div>

                    {/* Version (read-only) */}
                    <div class="sm:col-span-2">
                      <Label htmlFor="version">Version</Label>
                      <TextInput
                        id="version"
                        type="text"
                        value={formData.version}
                        disabled={true}
                      />
                    </div>

                    {/* Description - Two column section */}
                    <div class="sm:col-span-6">
                      <Label htmlFor="description">Description</Label>
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
                    <div class="sm:col-span-3">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        id="category"
                        value={formData.categories[0] || ''}
                        onChange={(value) => updateField('categories', value ? [value] : [])}
                        options={categoryOptions}
                        disabled={loadingCategories}
                        placeholder="Select a category..."
                      />
                    </div>

                    {/* Region */}
                    <div class="sm:col-span-3">
                      <Label htmlFor="region">Region</Label>
                      <Select
                        id="region"
                        value={formData.region || ''}
                        onChange={(value) => updateField('region', value || null)}
                        options={regionOptions}
                        disabled={loadingRegions}
                        placeholder="Select a region..."
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
                      />
                    </div>

                    {/* Provider (read-only) */}
                    <div class="sm:col-span-3">
                      <Label htmlFor="provider">Provider</Label>
                      <TextInput
                        id="provider"
                        type="text"
                        value={formData.provider}
                        disabled={true}
                      />
                    </div>

                    {/* Service (read-only) */}
                    <div class="sm:col-span-3">
                      <Label htmlFor="service">Service</Label>
                      <TextInput
                        id="service"
                        type="text"
                        value={formData.serviceName}
                        disabled={true}
                      />
                    </div>

                    {/* Source */}
                    <div class="sm:col-span-3">
                      <Label htmlFor="source">Source</Label>
                      <Select
                        id="source"
                        value={formData.source}
                        onChange={(value) => updateField('source', value)}
                        options={sourceOptions}
                      />
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { Toast, useToast } from '../components/common/Toast';
import { usePageTitle } from '../hooks/usePageTitle';
import { TextInput } from '../components/common/TextInput';
import { Select } from '../components/common/Select';
import { Label } from '../components/common/Label';
import { Button } from '../components/common/Button';

export function SettingsPage() {
  usePageTitle('Settings');
  const [, setLocation] = useLocation();
  const [isToastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Form state
  const [formData, setFormData] = useState({
    proxyType: 'hosted', // 'hosted' or 'custom'
    customProxyUrl: ''
  });

  // Proxy testing state
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState(null); // 'valid', 'invalid', 'unreachable'
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('slingshot-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setFormData({
          proxyType: settings.proxyType || 'hosted',
          customProxyUrl: settings.customProxyUrl || ''
        });
        if (settings.proxyType === 'custom' && settings.customProxyUrl) {
          setProxyTestResult('valid'); // Assume valid if previously saved
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Validate URL format
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Add protocol if missing
  const normalizeUrl = (url) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return '';
    
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      // Default to http:// for localhost, https:// for everything else
      if (trimmedUrl.startsWith('localhost') || trimmedUrl.startsWith('127.0.0.1')) {
        return 'http://' + trimmedUrl;
      } else {
        return 'https://' + trimmedUrl;
      }
    }
    return trimmedUrl;
  };

  // Test proxy health endpoint
  const testProxy = async () => {
    if (!formData.customProxyUrl.trim()) {
      setToastMessage('Please enter a proxy URL first');
      setToastType('error');
      showToast();
      return;
    }

    const normalizedUrl = normalizeUrl(formData.customProxyUrl);
    
    if (!isValidUrl(normalizedUrl)) {
      setToastMessage('Please enter a valid URL');
      setToastType('error');
      showToast();
      return;
    }

    setIsTestingProxy(true);
    setProxyTestResult(null);

    try {
      const healthUrl = normalizedUrl.replace(/\/$/, '') + '/health';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        setProxyTestResult('invalid');
        setToastMessage('Proxy returned an error response');
        setToastType('error');
        showToast();
        return;
      }

      const data = await response.json();
      
      // Check if response has required fields
      if (data.status === 'ok' && data['user-agent'] && data['user-agent'].includes('rb-slingshot')) {
        setProxyTestResult('valid');
        // Update form data with normalized URL
        setFormData(prev => ({ ...prev, customProxyUrl: normalizedUrl }));
        setToastMessage('Valid proxy found');
        setToastType('success');
        showToast();
      } else {
        setProxyTestResult('invalid');
        setToastMessage('No valid proxy found - missing required fields');
        setToastType('error');
        showToast();
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        setProxyTestResult('unreachable');
        setToastMessage('Proxy cannot be reached (timeout)');
        setToastType('error');
        showToast();
      } else {
        setProxyTestResult('unreachable');
        setToastMessage('Proxy cannot be reached');
        setToastType('error');
        showToast();
      }
    } finally {
      setIsTestingProxy(false);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validate custom proxy if selected
    if (formData.proxyType === 'custom') {
      if (!formData.customProxyUrl.trim()) {
        setToastMessage('Custom proxy URL is required');
        setToastType('error');
        showToast();
        return;
      }

      const normalizedUrl = normalizeUrl(formData.customProxyUrl);
      if (!isValidUrl(normalizedUrl)) {
        setToastMessage('Please enter a valid URL');
        setToastType('error');
        showToast();
        return;
      }

      if (proxyTestResult !== 'valid') {
        setToastMessage('Please test the proxy before saving');
        setToastType('error');
        showToast();
        return;
      }
    }

    try {
      // Save settings to localStorage
      const settings = {
        proxyType: formData.proxyType,
        customProxyUrl: formData.proxyType === 'custom' ? normalizeUrl(formData.customProxyUrl) : ''
      };

      localStorage.setItem('slingshot-settings', JSON.stringify(settings));
      
      setHasChanges(false);
      
      // Redirect to Slingshot root page immediately after successful save
      setLocation('/');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToastMessage('Failed to save settings');
      setToastType('error');
      showToast();
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocation('/');
      }
    } else {
      setLocation('/');
    }
  };

  const handleProxyTypeChange = (newType) => {
    setFormData({ ...formData, proxyType: newType });
    setHasChanges(true);
    if (newType === 'hosted') {
      setProxyTestResult(null);
    }
  };

  const handleCustomUrlChange = (newUrl) => {
    setFormData({ ...formData, customProxyUrl: newUrl });
    setHasChanges(true);
    setProxyTestResult(null); // Reset test result when URL changes
  };

  const canSave = formData.proxyType === 'hosted' || 
    (formData.proxyType === 'custom' && proxyTestResult === 'valid');

  return (
    <div class="h-full bg-gray-100 dark:bg-[#282a36] overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        <div class="max-w-4xl mx-auto px-4">
          <div class="bg-white dark:bg-surface-dark-elevated rounded-lg border border-gray-300 dark:border-neutral-dark-50 p-6">

            {/* Settings Form */}
            <form onSubmit={handleFormSubmit}>
              <div class="space-y-8">
                <div class="border-b border-gray-900/10 dark:border-neutral-dark-300 pb-8">
                  <h2 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900">Settings</h2>
                  <p class="mt-1 text-sm text-gray-600 dark:text-neutral-dark-600">Configure global settings for the Slingshot app.</p>

                  <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                    
                    {/* Proxy Type Dropdown */}
                    <div class="sm:col-span-4">
                      <Label htmlFor="proxy-type">Proxy</Label>
                      <Select
                        id="proxy-type"
                        value={formData.proxyType}
                        onChange={handleProxyTypeChange}
                        options={[
                          { value: 'hosted', label: 'Hosted Slingshot proxy' },
                          { value: 'custom', label: 'Custom proxy URL' }
                        ]}
                      />
                    </div>

                    {/* Custom Proxy URL Input */}
                    {formData.proxyType === 'custom' && (
                      <div class="sm:col-span-4">
                        <Label htmlFor="custom-proxy-url">Proxy URL</Label>
                        <div class="flex gap-2">
                          <TextInput
                            id="custom-proxy-url"
                            value={formData.customProxyUrl}
                            onInput={(e) => handleCustomUrlChange(e.target.value)}
                            placeholder="your-proxy-server.com"
                          />
                          <Button
                            type="button"
                            onClick={testProxy}
                            disabled={isTestingProxy || !formData.customProxyUrl.trim()}
                            variant="primary"
                          >
                            {isTestingProxy ? 'Testing...' : 'Test'}
                          </Button>
                        </div>
                      </div>
                    )}


                  </div>
                </div>
              </div>
            </form>

            {/* Action Buttons */}
            <div class="mt-6 flex items-center justify-between">
              <div class="flex items-center gap-x-3">
                <Button
                  onClick={handleFormSubmit}
                  type="button"
                  disabled={!canSave}
                  variant="primary"
                >
                  Save
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={hideToast}
        type={toastType}
      />
    </div>
  );
}
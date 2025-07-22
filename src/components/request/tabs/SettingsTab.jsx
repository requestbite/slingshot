export function SettingsTab({
  followRedirects,
  timeout,
  onFollowRedirectsChange,
  onTimeoutChange,
  onEnterKeyPress
}) {
  const handleTimeoutChange = (value) => {
    const numValue = parseInt(value, 10);
    if (numValue >= 1 && numValue <= 300) {
      onTimeoutChange(numValue);
    }
  };

  return (
    <>
      <div class="mb-2">
        <div class="space-y-4">
          {/* Automatically follow redirects setting */}
          <div class="flex items-center">
            <input 
              type="checkbox" 
              id="follow-redirects-checkbox" 
              checked={followRedirects}
              onChange={(e) => onFollowRedirectsChange(e.target.checked)}
              class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <label for="follow-redirects-checkbox" class="ml-2 block text-sm text-gray-900">
              Automatically follow redirects
            </label>
          </div>
          
          {/* Request timeout setting */}
          <div class="flex items-center">
            <label for="request-timeout-input" class="block text-sm text-gray-900 mr-3">
              Request timeout (seconds):
            </label>
            <input 
              type="number" 
              id="request-timeout-input" 
              value={timeout} 
              min="1" 
              max="300"
              onChange={(e) => handleTimeoutChange(e.target.value)}
              onKeyDown={onEnterKeyPress}
              class="w-24 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span class="ml-2 text-xs text-gray-500">(1-300 seconds)</span>
          </div>
        </div>
      </div>
    </>
  );
}
export function SettingsTab({
  followRedirects,
  timeout,
  onFollowRedirectsChange,
  onTimeoutChange
}) {
  const handleTimeoutChange = (value) => {
    const numValue = parseInt(value, 10);
    if (numValue >= 1 && numValue <= 300) {
      onTimeoutChange(numValue);
    }
  };

  return (
    <div class="p-4">
      <div class="space-y-6">
        {/* Follow Redirects Setting */}
        <div class="flex items-start space-x-3">
          <input
            type="checkbox"
            id="followRedirects"
            checked={followRedirects}
            onChange={(e) => onFollowRedirectsChange(e.target.checked)}
            class="mt-1 w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
          />
          <div class="flex-1">
            <label htmlFor="followRedirects" class="text-sm font-medium text-gray-700 cursor-pointer">
              Follow redirects
            </label>
            <p class="mt-1 text-xs text-gray-500">
              Automatically follow HTTP redirects (3xx status codes). When disabled, redirect responses will be returned as-is.
            </p>
          </div>
        </div>

        {/* Request Timeout Setting */}
        <div class="space-y-2">
          <label htmlFor="timeout" class="block text-sm font-medium text-gray-700">
            Request timeout (seconds)
          </label>
          <div class="flex items-center space-x-3">
            <input
              type="number"
              id="timeout"
              min="1"
              max="300"
              value={timeout}
              onChange={(e) => handleTimeoutChange(e.target.value)}
              class="w-20 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
            />
            <span class="text-sm text-gray-500">seconds</span>
          </div>
          <p class="text-xs text-gray-500">
            Maximum time to wait for a response (1-300 seconds). The request will be cancelled if no response is received within this time.
          </p>
        </div>

        {/* Additional Settings Info */}
        <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-blue-700">
              <h4 class="font-medium mb-2">Request Settings</h4>
              <ul class="space-y-1 text-xs">
                <li><strong>Follow redirects:</strong> Controls whether to automatically follow HTTP redirects</li>
                <li><strong>Timeout:</strong> Maximum time to wait for a response before cancelling the request</li>
              </ul>
              <p class="mt-2 text-xs">
                These settings apply only to this request and override any global defaults.
              </p>
            </div>
          </div>
        </div>

        {/* Future Settings Placeholder */}
        <div class="pt-4 border-t border-gray-200">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Coming Soon</h4>
          <div class="space-y-3 opacity-50">
            <div class="flex items-center space-x-3">
              <input type="checkbox" disabled class="w-4 h-4 border-gray-300 rounded" />
              <span class="text-sm text-gray-600">Verify SSL certificates</span>
            </div>
            <div class="flex items-center space-x-3">
              <input type="checkbox" disabled class="w-4 h-4 border-gray-300 rounded" />
              <span class="text-sm text-gray-600">Send cookies</span>
            </div>
            <div class="flex items-center space-x-3">
              <input type="checkbox" disabled class="w-4 h-4 border-gray-300 rounded" />
              <span class="text-sm text-gray-600">Use proxy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
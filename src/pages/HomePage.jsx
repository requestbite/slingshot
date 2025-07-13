export function HomePage() {
  return (
    <div class="flex items-center justify-center h-full">
      <div class="text-center max-w-md mx-auto p-8">
        <div class="mb-6">
          <svg class="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        
        <h1 class="text-3xl font-bold text-gray-900 mb-4">
          Welcome to RequestBite Slingshot
        </h1>
        
        <p class="text-gray-600 mb-8 leading-relaxed">
          Import an OpenAPI specification to get started building and testing your API requests.
        </p>
        
        <button class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          Import OpenAPI Spec
        </button>
        
        <div class="mt-12 pt-8 border-t border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Features</h2>
          <div class="grid grid-cols-1 gap-4 text-left">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700">Import and organize API collections</span>
            </div>
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700">Test HTTP requests with full response details</span>
            </div>
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700">Manage environments and variables</span>
            </div>
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700">Store data locally in your browser</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
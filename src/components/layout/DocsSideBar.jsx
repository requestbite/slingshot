import { useState } from 'preact/hooks';

export function DocsSideBar({ onClose: _onClose }) {
  return (
    <>
      {/* Documentation Sidebar */}
      <aside class="bg-white rounded-lg md:border border-gray-300 h-full">
        <div class="flex grow flex-col gap-y-5 overflow-y-auto p-4">
          <nav class="flex flex-1 flex-col space-y-4">
            {/* Header */}
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-medium text-gray-900">Documentation</h2>
            </div>

            {/* Placeholder content */}
            <div class="space-y-4">
              <div class="text-sm text-gray-600">
                <p class="mb-3">Request documentation will appear here.</p>

                <div class="space-y-2">
                  <div class="p-3 bg-gray-50 rounded-md">
                    <h3 class="text-xs font-medium text-gray-700 mb-1">Description</h3>
                    <p class="text-xs text-gray-500">Request description and notes will be displayed here.</p>
                  </div>

                  <div class="p-3 bg-gray-50 rounded-md">
                    <h3 class="text-xs font-medium text-gray-700 mb-1">Examples</h3>
                    <p class="text-xs text-gray-500">Code examples and usage patterns will be shown here.</p>
                  </div>

                  <div class="p-3 bg-gray-50 rounded-md">
                    <h3 class="text-xs font-medium text-gray-700 mb-1">Response Schema</h3>
                    <p class="text-xs text-gray-500">Expected response format and schema documentation.</p>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
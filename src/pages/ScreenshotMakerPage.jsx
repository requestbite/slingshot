import { useState } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';

export function ScreenshotMakerPage() {
  usePageTitle('Screenshot Maker');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        <div class="max-w-6xl mx-auto px-4">

          {/* Sidebar Toggle Button for Mobile - only show when sidebar is hidden */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            class={`fixed top-1/2 -left-1 transform -translate-y-1/2 z-50 bg-sky-100 hover:bg-sky-200 text-sky-700 p-2 rounded-r-lg shadow-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${
              isSidebarOpen ? 'hidden' : 'block md:hidden'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          </button>

          <div class="flex gap-4">
            {/* Desktop Sidebar */}
            <div class="w-64 flex-shrink-0 hidden md:block">
              <div class="bg-white rounded-lg border border-gray-300">
                <div class="flex grow flex-col gap-y-5 overflow-y-auto px-6 py-4">
                  <nav class="flex flex-1 flex-col">
                    <div class="text-xs mb-2 text-gray-500">TODO: Sidebar Section</div>
                    <p class="text-sm text-gray-700">TODO: Sidebar content</p>
                  </nav>
                </div>
              </div>
            </div>

            {/* Mobile Sidebar */}
            {isSidebarOpen && (
              <>
                {/* Full screen overlay covering topbar */}
                <div
                  class="fixed inset-0 bg-gray-500/75 z-[60] md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />

                {/* Mobile Sidebar - takes full screen minus 75px, covers topbar */}
                <div class="fixed left-0 top-0 bottom-0 right-[75px] bg-white z-[70] md:hidden overflow-y-auto">
                  <div class="p-6">
                    <nav class="flex flex-1 flex-col">
                      <div class="text-xs mb-2 text-gray-500">TODO: Sidebar Section</div>
                      <p class="text-sm text-gray-700">TODO: Sidebar content</p>
                    </nav>
                  </div>
                </div>
              </>
            )}

            {/* Content Area */}
            <div class="flex-1 min-w-0 overflow-hidden">
              <div class="bg-white rounded-lg border border-gray-300 p-6 w-full max-w-full overflow-hidden">
                <h2 class="text-base font-semibold text-gray-900">TODO: Content Title</h2>
                <p class="mt-1 text-sm text-gray-600 mb-6">TODO: Content description</p>

                <div>
                  <p class="text-sm text-gray-500">TODO: Main content area</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

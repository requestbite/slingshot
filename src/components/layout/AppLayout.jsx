import { useState } from 'preact/hooks';
import { TopBar } from './TopBar';
import { SideBar } from './SideBar';

export function AppLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div class="h-screen flex flex-col bg-white">
      <TopBar />

      {/* Sidebar Toggle Button for Mobile - only show when sidebar is hidden */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        class={`fixed top-1/2 -left-1 transform -translate-y-1/2 z-50 bg-sky-100 hover:bg-sky-200 text-sky-700 p-2 rounded-r-lg shadow-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${isSidebarOpen ? 'hidden' : 'block md:hidden'
          }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 17 5-5-5-5" />
          <path d="m13 17 5-5-5-5" />
        </svg>
      </button>

      <main class="flex-grow flex flex-col">
        <div class="flex-grow flex mt-[65px] p-4 bg-gray-100 overflow-x-hidden">
          {/* Sidebar - left column */}
          <div class="mt-[2px] w-[300px] flex-shrink-0 mr-4 min-h-full hidden md:block">
            <SideBar />
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
                <SideBar onClose={() => setIsSidebarOpen(false)} />
              </div>
            </>
          )}

          {/* Main content area - fills available space */}
          <div class="mt-[2px] rounded-lg bg-white border border-gray-300 w-full min-h-full flex flex-col overflow-x-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

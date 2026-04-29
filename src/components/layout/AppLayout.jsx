import { useState } from 'preact/hooks';
import { SideBar } from './SideBar';
import { DocsSideBar } from './DocsSideBar';
import { useAppContext } from '../../hooks/useAppContext';

export function AppLayout({ children, showDocsSidebar = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDocsSidebarOpen, setIsDocsSidebarOpen] = useState(false);
  const { selectedCollection, isDocsSidebarVisible, isMobileMenuOpen } = useAppContext();

  // Show docs sidebar if explicitly requested OR if a collection is selected
  // Visibility is controlled separately for large screen toggling
  const shouldShowDocsSidebar = showDocsSidebar || (selectedCollection !== null);

  return (
    <div class="flex-grow flex flex-col min-h-0">{/* TopBar now handled at App level */}

      {/* Sidebar Toggle Button for Mobile - only show when sidebar is hidden */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        class={`fixed top-1/2 -left-1 transform -translate-y-1/2 z-[50] bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400 p-2 rounded-r-lg shadow-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${isSidebarOpen ? 'hidden' : 'block md:hidden'
          }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 17 5-5-5-5" />
          <path d="m13 17 5-5-5-5" />
        </svg>
      </button>

      {/* Docs Sidebar Toggle Button for Mobile/Tablet - only show when docs sidebar is visible (tab says Hide docs) and mobile menu is closed */}
      {shouldShowDocsSidebar && isDocsSidebarVisible && !isMobileMenuOpen && (
        <button
          onClick={() => setIsDocsSidebarOpen(true)}
          class={`fixed top-1/2 -right-1 transform -translate-y-1/2 z-50 bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400 p-2 rounded-l-lg shadow-lg cursor-pointer transition-all duration-200 hover:-translate-x-1 ${isDocsSidebarOpen ? 'hidden' : 'docs-toggle-responsive'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 17-5-5 5-5" />
            <path d="m11 17-5-5 5-5" />
          </svg>
        </button>
      )}

      <main class="flex-grow flex flex-col min-h-0">
        <div class="flex mt-[65px] p-4 bg-gray-100 dark:bg-[#282a36] flex-grow min-h-0 md:flex-none md:h-[calc(100vh-65px)] md:overflow-hidden">
          {/* Sidebar - left column */}
          <div class="mt-[2px] w-[300px] flex-shrink-0 mr-4 hidden md:block md:overflow-hidden">
            <SideBar />
          </div>

          {/* Mobile Sidebar */}
          {isSidebarOpen && (
            <>
              {/* Full screen overlay covering topbar */}
              <div
                class="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/60 z-[60] md:hidden animate-fade-in"
                onClick={() => setIsSidebarOpen(false)}
              />

              {/* Mobile Sidebar - takes full screen minus 75px, covers topbar */}
              <div class="fixed left-0 top-0 bottom-0 right-[75px] bg-white dark:bg-[#282a36] z-[70] md:hidden overflow-y-auto animate-slide-in-left">
                <SideBar onClose={() => setIsSidebarOpen(false)} />
              </div>
            </>
          )}

          {/* Mobile/Tablet Docs Sidebar */}
          {shouldShowDocsSidebar && isDocsSidebarOpen && (
            <>
              {/* Full screen overlay covering topbar */}
              <div
                class="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/60 z-[60] docs-toggle-responsive animate-fade-in"
                onClick={() => setIsDocsSidebarOpen(false)}
              />

              {/* Mobile/Tablet Docs Sidebar - takes full screen minus 75px, covers topbar */}
              <div class="fixed right-0 top-0 bottom-0 left-[75px] bg-white dark:bg-[#282a36] z-[70] docs-toggle-responsive overflow-y-auto animate-slide-in-right">
                <DocsSideBar onClose={() => setIsDocsSidebarOpen(false)} />
              </div>
            </>
          )}

          {/* Main content area - fills available space */}
          <div class={`mt-[2px] rounded-lg bg-white dark:bg-surface-dark-elevated border border-gray-300 dark:border-neutral-dark-50 w-full min-w-0 flex flex-col overflow-x-auto md:overflow-y-auto scrollbar-hide`}>
            {children}
          </div>

          {/* Docs Sidebar - right column */}
          {shouldShowDocsSidebar && (
            <div class={`mt-[2px] h-full w-[300px] flex-shrink-0 ml-4 docs-sidebar-responsive overflow-hidden ${!isDocsSidebarVisible ? 'docs-sidebar-hidden' : ''}`}>
              <DocsSideBar />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

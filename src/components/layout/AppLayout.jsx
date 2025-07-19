import { TopBar } from './TopBar';
import { SideBar } from './SideBar';

export function AppLayout({ children }) {
  return (
    <div class="h-screen flex flex-col bg-white">
      <TopBar />
      <main class="flex-grow flex flex-col">
        <div class="flex-grow flex mt-[65px] p-4 bg-gray-100 overflow-x-hidden">
          {/* Sidebar - left column */}
          <div class="mt-[2px] w-[300px] flex-shrink-0 mr-4 min-h-full hidden md:block">
            <SideBar />
          </div>

          {/* Main content area - fills available space */}
          <div class="mt-[2px] rounded-lg bg-white border border-gray-300 w-full min-h-full flex flex-col overflow-x-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

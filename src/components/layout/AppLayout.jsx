import { TopBar } from './TopBar';
import { SideBar } from './SideBar';

export function AppLayout({ children }) {
  return (
    <div class="h-screen flex flex-col bg-gray-50">
      <TopBar />
      <div class="flex flex-1 overflow-hidden pt-16">
        <SideBar />
        <main class="flex-1 overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
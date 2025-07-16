import { TopBar } from './TopBar';

export function FullPageLayout({ children }) {
  return (
    <div class="h-screen flex flex-col bg-gray-50">
      <TopBar />
      <main class="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
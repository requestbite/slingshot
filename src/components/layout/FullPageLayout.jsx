export function FullPageLayout({ children }) {
  return (
    <main class="flex-1 overflow-hidden mt-[65px]">{/* TopBar now handled at App level, add margin-top for fixed TopBar */}
      {children}
    </main>
  );
}
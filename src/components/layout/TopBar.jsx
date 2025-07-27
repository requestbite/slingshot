import { useLocation } from 'wouter-preact';
import LogoHorizontal from '../../assets/logo-horizontal.svg';

export function TopBar() {
  const [location, setLocation] = useLocation();

  const isActive = (path) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const isSlingshotActive = () => {
    if (location === '/') return true;
    // Check if URL starts with UUID pattern (8-4-4-4-12 characters)
    const uuidPattern = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    return uuidPattern.test(location);
  };

  return (
    <header class="h-[65px] bg-white/75 backdrop-blur-lg border-b border-gray-300 fixed top-0 left-0 w-full z-10 text-sm">
      <div class="flex items-center h-full px-4">
        {/* Logo and Navigation */}
        <div class="flex items-center space-x-6">
          <button
            onClick={() => setLocation('/')}
            class="flex items-center hover:opacity-80 transition-opacity hover:cursor-pointer"
          >
            <img
              src={LogoHorizontal}
              alt="RequestBite"
              class="h-8 w-auto"
            />
          </button>

          <nav class="flex items-center space-x-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                setLocation('/');
              }}
              class={`px-3 py-2 rounded-md transition-colors hover:cursor-pointer ${isSlingshotActive()
                ? 'text-sky-700 bg-sky-100 hover:bg-sky-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Slingshot
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setLocation('/collections');
              }}
              class={`px-3 py-2 rounded-md transition-colors hover:cursor-pointer ${isActive('/collections')
                ? 'text-sky-700 bg-sky-100 hover:bg-sky-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Collections
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setLocation('/settings');
              }}
              class={`px-3 py-2 rounded-md transition-colors hover:cursor-pointer ${isActive('/settings')
                ? 'text-sky-700 bg-sky-100 hover:bg-sky-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              Settings
            </button>
            <a href="https://docs.requestbite.com" target="_blank" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
              Documentation
            </a>
          </nav>
        </div>

      </div>
    </header>
  );
}

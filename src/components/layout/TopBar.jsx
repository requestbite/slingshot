import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import LogoHorizontal from '../../assets/logo-horizontal-slingshot.svg';

export function TopBar() {
  const [location, setLocation] = useLocation();
  const [proxyConfig, setProxyConfig] = useState({ proxyType: 'hosted', customProxyUrl: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Load proxy settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('slingshot-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setProxyConfig({
          proxyType: settings.proxyType || 'hosted',
          customProxyUrl: settings.customProxyUrl || ''
        });
      } catch (error) {
        console.error('Failed to load proxy settings:', error);
      }
    }
  }, [location]); // Re-check when location changes (e.g., when coming back from settings)

  // Function to get banner text and styling
  const getProxyBanner = (isMobile = false) => {
    if (proxyConfig.proxyType === 'custom' && proxyConfig.customProxyUrl) {
      const text = isMobile ? 'Custom proxy' : `Custom proxy: ${proxyConfig.customProxyUrl}`;
      return {
        text,
        textXl: `Custom proxy: ${proxyConfig.customProxyUrl}`,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        hoverColor: 'hover:bg-green-200'
      };
    } else {
      return {
        text: 'Slingshot proxy',
        textXl: 'Slingshot proxy',
        bgColor: 'bg-sky-100',
        textColor: 'text-sky-800',
        hoverColor: 'hover:bg-sky-200'
      };
    }
  };

  // Waypoints SVG icon component
  const WaypointsIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="mr-1.5"
    >
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="m10.2 6.3-3.9 3.9" />
      <circle cx="4.5" cy="12" r="2.5" />
      <path d="M7 12h10" />
      <circle cx="19.5" cy="12" r="2.5" />
      <path d="m13.8 17.7 3.9-3.9" />
      <circle cx="12" cy="19.5" r="2.5" />
    </svg>
  );

  const banner = getProxyBanner();

  return (
    <header class="h-[65px] bg-white/75 backdrop-blur-lg border-b border-gray-300 fixed top-0 left-0 w-full z-10 text-sm">
      <div class="flex items-center justify-between h-full px-4">
        {/* Logo */}
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

        {/* Desktop Navigation */}
        <nav class="hidden sm:flex items-center space-x-1">
          <a href="https://requestbite.com" class="hidden lg:flex text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center">
            RequestBite
          </a>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setLocation('/');
            }}
            class={`px-3 py-2 rounded-md transition-colors hover:cursor-pointer no-underline ${isSlingshotActive()
              ? 'text-sky-700 bg-sky-100 hover:bg-sky-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            Slingshot
          </a>
          <a
            href="/environments"
            onClick={(e) => {
              e.preventDefault();
              setLocation('/environments');
            }}
            class={`px-3 py-2 rounded-md transition-colors hover:cursor-pointer no-underline ${isActive('/environments')
              ? 'text-sky-700 bg-sky-100 hover:bg-sky-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            Environments
          </a>
          <a
            href="/collections"
            onClick={(e) => {
              e.preventDefault();
              setLocation('/collections');
            }}
            class={`px-3 py-2 rounded-md transition-colors hover:cursor-pointer no-underline ${isActive('/collections')
              ? 'text-sky-700 bg-sky-100 hover:bg-sky-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            Collections
          </a>
          <a
            href="/settings"
            onClick={(e) => {
              e.preventDefault();
              setLocation('/settings');
            }}
            class={`px-3 py-2 rounded-md transition-colors hover:cursor-pointer no-underline ${isActive('/settings')
              ? 'text-sky-700 bg-sky-100 hover:bg-sky-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            Settings
          </a>
          <a href="https://docs.requestbite.com" target="_blank" class="hidden lg:flex text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center">
            Docs
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="ml-1"
            >
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </a>
        </nav>

        {/* Right Section: Proxy Banner + Mobile Menu */}
        <div class="flex items-center space-x-3">
          {/* Desktop Proxy Status Banner */}
          <button
            onClick={() => setLocation('/settings')}
            class={`hidden md:flex px-2 py-1 rounded-md text-xs transition-colors cursor-pointer items-center ${banner.bgColor} ${banner.textColor} ${banner.hoverColor}`}
          >
            <WaypointsIcon />
            <span class="hidden xl:inline">{banner.textXl}</span>
            <span class="xl:hidden">{proxyConfig.proxyType === 'custom' ? 'Custom proxy' : banner.text}</span>
          </button>

          {/* Mobile Hamburger Menu */}
          <div class="block lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              type="button"
              class="cursor-pointer text-gray-600 hover:text-gray-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class="w-6 h-6">
                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
                  <path d="M7.94971 11.9497H39.9497" />
                  <path d="M7.94971 23.9497H39.9497" />
                  <path d="M7.94971 35.9497H39.9497" />
                </g>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            class="fixed inset-0 h-screen w-screen bg-black opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <div class="fixed top-0 right-0 inset-y-0 h-screen w-[calc(100%-75px)] bg-white shadow-lg z-50 text-left overflow-y-auto">
            <div class="flex items-center justify-between border-b border-gray-300">
              <button
                onClick={() => setLocation('/')}
                class="ml-3 mr-1.5 p-1.5 hover:opacity-80 transition-opacity"
              >
                <span class="sr-only">RequestBite</span>
                <img class="h-8 w-auto" src={LogoHorizontal} alt="RequestBite" />
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                class="m-2.5 rounded-md p-2.5 text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                <span class="sr-only">Close menu</span>
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="mt-6 flow-root text-sm bg-white">
              <div class="-my-6 divide-y divide-gray-500/10">
                <div class="space-y-2 py-6">
                  <a
                    href="https://requestbite.com"
                    class="block px-4 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer no-underline"
                  >
                    <div>RequestBite</div>
                    <span class="text-xs text-gray-500 mt-1">RequestBite website</span>
                  </a>
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation('/');
                      setIsMobileMenuOpen(false);
                    }}
                    class="block w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer no-underline"
                  >
                    <div>Slingshot</div>
                    <span class="text-xs text-gray-500 mt-1">Send HTTP requests</span>
                  </a>
                  <a
                    href="/environments"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation('/environments');
                      setIsMobileMenuOpen(false);
                    }}
                    class="block w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer no-underline"
                  >
                    <div>Environments</div>
                    <span class="text-xs text-gray-500 mt-1">Manage encrypted environments</span>
                  </a>
                  <a
                    href="/collections"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation('/collections');
                      setIsMobileMenuOpen(false);
                    }}
                    class="block w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer no-underline"
                  >
                    <div>Collections</div>
                    <span class="text-xs text-gray-500 mt-1">Manage request collections</span>
                  </a>
                  <a
                    href="/settings"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation('/settings');
                      setIsMobileMenuOpen(false);
                    }}
                    class="block w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer no-underline"
                  >
                    <div>Settings</div>
                    <span class="text-xs text-gray-500 mt-1">Configure app settings</span>
                  </a>
                  <a
                    href="https://docs.requestbite.com"
                    target="_blank"
                    class="block px-4 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer"
                  >
                    <div class="flex items-center">
                      Docs
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="ml-1"
                      >
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                    </div>
                    <span class="text-xs text-gray-500 mt-1">Documentation</span>
                  </a>

                  {/* Mobile Proxy Banner */}
                  <button
                    onClick={() => {
                      setLocation('/settings');
                      setIsMobileMenuOpen(false);
                    }}
                    class={`mx-4 mt-4 px-3 py-2 rounded-md text-xs transition-colors cursor-pointer flex items-center ${banner.bgColor} ${banner.textColor} ${banner.hoverColor}`}
                  >
                    <WaypointsIcon />
                    {banner.text}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

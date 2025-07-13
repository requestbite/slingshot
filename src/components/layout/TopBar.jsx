export function TopBar() {
  return (
    <header class="bg-white/95 backdrop-blur-lg border-b border-gray-200 fixed top-0 left-0 w-full z-50 h-16">
      <div class="flex items-center justify-between h-full px-4">
        {/* Left side - Logo and Navigation */}
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">RB</span>
            </div>
            <span class="font-semibold text-gray-900">RequestBite</span>
          </div>
          
          <nav class="hidden md:flex items-center space-x-4">
            <a href="#" class="text-blue-600 font-medium px-3 py-2 rounded-md bg-blue-50">
              Slingshot
            </a>
            <a href="#" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100">
              Inspector
            </a>
            <a href="#" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100">
              Mock
            </a>
            <a href="#" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100">
              Docs
            </a>
          </nav>
        </div>

        {/* Right side - User menu */}
        <div class="flex items-center space-x-4">
          <button class="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          
          <div class="relative">
            <button class="flex items-center space-x-2 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium text-gray-700">U</span>
              </div>
              <span class="hidden md:block text-sm font-medium">User</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
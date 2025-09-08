export function WelcomeMessage() {
  return (
    <div class="text-center py-8 flex flex-col items-center justify-center">
      <div class="mx-auto w-36 mb-4">
        <img src="/images/rabbit-slinging-v1.webp" alt="Slingshot Rabbit" class="w-full h-auto" />
      </div>

      <p class="text-xl font-semibold text-gray-700 mb-1">Slingshot</p>
      <p class="text-sm">
        <a href="https://docs.requestbite.com/articles/another-kind-of-client/" target="_blank" class="text-gray-500 hover:text-gray-400 hover:underline flex items-center">
          Not your average API client
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
            <path d="M15 3h6v6"></path>
            <path d="M10 14 21 3"></path>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          </svg>
        </a>
      </p>
      <div class="mt-4 flex items-center justify-center w-8 h-8 mx-auto text-white bg-gradient-to-b from-orange-300 to-orange-400 hover:from-orange-400 hover:to-orange-500 font-bold rounded-full outline-1 outline-orange-300 border-2">
        1
      </div>
      <div class="w-px h-4 bg-gray-300"></div>
      <div class="bg-gray-50 px-2 py-1 text-gray-500 text-sm rounded-md border border-gray-200">
        Hit Send to make a request.
      </div>
      <div class="mt-4 flex items-center justify-center w-8 h-8 mx-auto text-white bg-gradient-to-b from-orange-300 to-orange-400 hover:from-orange-400 hover:to-orange-500 font-bold rounded-full outline-1 outline-orange-300 border-2">
        2
      </div>
      <div class="w-px h-4 bg-gray-300"></div>
      <div class="bg-gray-50 px-2 py-1 text-gray-500 text-sm rounded-md border border-gray-200">
        <button 
          onClick={() => window.openUrlImportModal?.('https://docs.requestbite.com/assets/curl-apps.json')} 
          class="text-gray-400 underline bg-transparent border-none p-0 cursor-pointer hover:text-gray-500"
        >
          Import
        </button> some fun HTTP requests to explore.
      </div>
      <div class="mt-4 flex items-center justify-center w-8 h-8 mx-auto text-white bg-gradient-to-b from-orange-300 to-orange-400 hover:from-orange-400 hover:to-orange-500 font-bold rounded-full outline-1 outline-orange-300 border-2">
        3
      </div>
      <div class="w-px h-4 bg-gray-300"></div>
      <div class="bg-gray-50 px-2 py-1 text-gray-500 text-sm rounded-md border border-gray-200">
        <a href="https://docs.requestbite.com/slingshot/slingshot/" target="_blank" class="text-gray-500 hover:text-gray-400 hover:underline flex items-center">
          Read the docs
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
            <path d="M15 3h6v6"></path>
            <path d="M10 14 21 3"></path>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          </svg>
        </a>
      </div>
    </div>
  );
}

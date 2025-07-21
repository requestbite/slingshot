export function WelcomeMessage() {
  return (
    <div class="text-center py-8 flex flex-col items-center justify-center">
      <div class="mx-auto w-64 mb-4">
        <img src="/images/rabbit-slinging-v1.webp" alt="Slingshot Rabbit" class="w-full h-auto" />
      </div>
      
      <p class="text-xl font-semibold text-gray-700 mb-2">Slingshot</p>
      <p class="text-sm text-gray-500">Hit Send to make a request.</p>
    </div>
  );
}
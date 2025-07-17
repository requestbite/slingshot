export function WelcomeMessage() {
  return (
    <div class="text-center py-8 flex flex-col items-center justify-center">
      <div class="mx-auto w-64 mb-4">
        <svg
          class="w-full h-auto text-sky-600"
          viewBox="0 0 200 150"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          {/* Rabbit body */}
          <ellipse cx="100" cy="90" rx="30" ry="25" fill="currentColor" opacity="0.1" />
          
          {/* Rabbit head */}
          <circle cx="100" cy="50" r="20" fill="currentColor" opacity="0.1" />
          
          {/* Rabbit ears */}
          <ellipse cx="90" cy="35" rx="4" ry="15" fill="currentColor" opacity="0.2" />
          <ellipse cx="110" cy="35" rx="4" ry="15" fill="currentColor" opacity="0.2" />
          
          {/* Rabbit eyes */}
          <circle cx="94" cy="48" r="2" fill="currentColor" />
          <circle cx="106" cy="48" r="2" fill="currentColor" />
          
          {/* Rabbit nose */}
          <path d="M100 52 L98 54 L102 54 Z" fill="currentColor" />
          
          {/* Slingshot frame */}
          <path d="M70 80 Q60 60 50 40 Q55 35 65 40 Q75 60 85 80" stroke="currentColor" stroke-width="3" fill="none" />
          <path d="M130 80 Q140 60 150 40 Q145 35 135 40 Q125 60 115 80" stroke="currentColor" stroke-width="3" fill="none" />
          
          {/* Slingshot elastic */}
          <path d="M65 40 Q100 70 135 40" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="5,5" />
          
          {/* Motion lines */}
          <path d="M160 45 L175 40" stroke="currentColor" stroke-width="2" opacity="0.5" />
          <path d="M165 50 L180 45" stroke="currentColor" stroke-width="2" opacity="0.5" />
          <path d="M170 55 L185 50" stroke="currentColor" stroke-width="2" opacity="0.5" />
        </svg>
      </div>
      
      <p class="text-xl font-semibold text-gray-700 mb-2">Slingshot</p>
      <p class="text-sm text-gray-500">Hit Send to make a request.</p>
    </div>
  );
}
import { HoverCard, HoverCardTrigger, HoverCardContent } from './HoverCard';

export default {
  title: 'Common/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A card that appears when hovering over a trigger element, useful for previewing content without navigating away.',
      },
    },
  },
};

// Default usage matching ShadCN demo style
export const Default = {
  render: () => (
    <div class="flex justify-center p-16">
      <HoverCard>
        <HoverCardTrigger>
          <a
            href="#"
            class="text-sm font-medium text-sky-600 underline underline-offset-4 hover:text-sky-800 cursor-pointer"
            onClick={(e) => e.preventDefault()}
          >
            @nextjs
          </a>
        </HoverCardTrigger>
        <HoverCardContent>
          <div class="flex justify-between gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white text-xs font-bold">
              N
            </div>
            <div class="space-y-1">
              <h4 class="text-sm font-semibold">@nextjs</h4>
              <p class="text-sm text-gray-600">
                The React Framework – created and maintained by @vercel.
              </p>
              <div class="flex items-center gap-1 pt-2">
                <svg class="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span class="text-xs text-gray-500">Joined December 2021</span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
};

// API endpoint info card
export const APIEndpoint = {
  render: () => (
    <div class="flex justify-center p-16">
      <HoverCard openDelay={300}>
        <HoverCardTrigger>
          <span class="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 border border-sky-200 cursor-default">
            GET /users
          </span>
        </HoverCardTrigger>
        <HoverCardContent>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">GET</span>
              <span class="text-sm font-medium">/users</span>
            </div>
            <p class="text-xs text-gray-600">Returns a paginated list of all users in the organization.</p>
            <div class="space-y-1 pt-1 border-t border-gray-100">
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500">Auth required</span>
                <span class="text-green-600 font-medium">Yes</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500">Rate limit</span>
                <span class="text-gray-700">1000 / hour</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500">Response</span>
                <span class="text-gray-700">application/json</span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
};

// User profile card
export const UserProfile = {
  render: () => (
    <div class="flex justify-center p-16">
      <HoverCard openDelay={400}>
        <HoverCardTrigger>
          <button class="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white text-xs font-semibold">
              JD
            </div>
            <span>Jane Doe</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start">
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white text-sm font-semibold">
                JD
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">Jane Doe</p>
                <p class="text-xs text-gray-500">jane.doe@example.com</p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 border-t border-gray-100 pt-2">
              <div class="text-center">
                <p class="text-sm font-semibold text-gray-900">12</p>
                <p class="text-xs text-gray-500">Projects</p>
              </div>
              <div class="text-center">
                <p class="text-sm font-semibold text-gray-900">48</p>
                <p class="text-xs text-gray-500">APIs</p>
              </div>
              <div class="text-center">
                <p class="text-sm font-semibold text-gray-900">Admin</p>
                <p class="text-xs text-gray-500">Role</p>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
};

// Side variants
export const Sides = {
  render: () => (
    <div class="flex flex-col items-center gap-8 p-16">
      {['bottom', 'top', 'left', 'right'].map((side) => (
        <HoverCard key={side} openDelay={100} closeDelay={100}>
          <HoverCardTrigger>
            <button class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer w-40">
              side="{side}"
            </button>
          </HoverCardTrigger>
          <HoverCardContent side={side}>
            <p class="text-sm text-gray-700">
              This card opens on the <strong>{side}</strong> side.
            </p>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
};

// Align variants
export const Alignment = {
  render: () => (
    <div class="flex flex-col items-center gap-8 p-16">
      {['start', 'center', 'end'].map((align) => (
        <HoverCard key={align} openDelay={100} closeDelay={100}>
          <HoverCardTrigger>
            <button class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer w-40">
              align="{align}"
            </button>
          </HoverCardTrigger>
          <HoverCardContent align={align}>
            <p class="text-sm text-gray-700">
              This card is <strong>{align}</strong>-aligned.
            </p>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
};

// Fast delays
export const FastDelays = {
  render: () => (
    <div class="flex justify-center p-16">
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger>
          <button class="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 cursor-pointer">
            Quick hover (100ms)
          </button>
        </HoverCardTrigger>
        <HoverCardContent>
          <p class="text-sm text-gray-700">
            This card opens with a short <strong>100ms</strong> delay and closes after <strong>100ms</strong>.
          </p>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
};

// Multiple hover cards
export const MultipleCards = {
  render: () => (
    <div class="flex justify-center gap-6 p-16">
      {[
        { label: 'Documentation', desc: 'Browse API reference, guides, and examples.' },
        { label: 'Changelog', desc: 'See the latest updates and new features.' },
        { label: 'Status', desc: 'Check real-time service health and uptime.' },
      ].map(({ label, desc }) => (
        <HoverCard key={label} openDelay={300}>
          <HoverCardTrigger>
            <a
              href="#"
              class="text-sm font-medium text-gray-700 underline underline-offset-4 decoration-gray-300 hover:text-gray-900 hover:decoration-gray-600 cursor-pointer"
              onClick={(e) => e.preventDefault()}
            >
              {label}
            </a>
          </HoverCardTrigger>
          <HoverCardContent>
            <div class="space-y-1">
              <h4 class="text-sm font-semibold text-gray-900">{label}</h4>
              <p class="text-sm text-gray-600">{desc}</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
};

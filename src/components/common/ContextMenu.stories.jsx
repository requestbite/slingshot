import { fn } from 'storybook/test';
import { useState, useRef } from 'preact/hooks';
import { ContextMenu } from './ContextMenu';

export default {
  title: 'Common/ContextMenu',
  component: ContextMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

const basicMenuItems = [
  {
    label: 'Edit',
    onClick: fn(),
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    label: 'Duplicate',
    onClick: fn(),
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  { divider: true },
  {
    label: 'Delete',
    onClick: fn(),
    destructive: true,
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    )
  }
];

// Interactive example
export const Interactive = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(false);
      const buttonRef = useRef();

      return (
        <div class="p-8">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Right Click Me or Click to Open Menu
          </button>

          <ContextMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={buttonRef.current}
            items={basicMenuItems}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Position: Right (default)
export const PositionRight = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);
      const buttonRef = useRef();

      return (
        <div class="p-8">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Click Me (Right Position)
          </button>

          <ContextMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={buttonRef.current}
            items={basicMenuItems}
            position="right"
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Position: Below
export const PositionBelow = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);
      const buttonRef = useRef();

      return (
        <div class="p-8">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Click Me (Below Position)
          </button>

          <ContextMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={buttonRef.current}
            items={basicMenuItems}
            position="below"
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Custom width
export const CustomWidth = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);
      const buttonRef = useRef();

      return (
        <div class="p-8">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Wide Menu (250px)
          </button>

          <ContextMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={buttonRef.current}
            items={basicMenuItems}
            width={250}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// With disabled items
export const WithDisabledItems = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);
      const buttonRef = useRef();

      const itemsWithDisabled = [
        { label: 'Available Action', onClick: fn() },
        { label: 'Disabled Action', onClick: fn(), disabled: true },
        { label: 'Another Available', onClick: fn() },
        { divider: true },
        { label: 'Delete (Disabled)', onClick: fn(), destructive: true, disabled: true },
      ];

      return (
        <div class="p-8">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Menu with Disabled Items
          </button>

          <ContextMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={buttonRef.current}
            items={itemsWithDisabled}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Request context menu (realistic example)
export const RequestContextMenu = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);
      const buttonRef = useRef();

      const requestMenuItems = [
        {
          label: 'Rename / Move...',
          onClick: () => console.log('Rename clicked'),
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )
        },
        {
          label: 'Duplicate',
          onClick: () => console.log('Duplicate clicked'),
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )
        },
        { divider: true },
        {
          label: 'Delete...',
          onClick: () => console.log('Delete clicked'),
          destructive: true,
          icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )
        }
      ];

      return (
        <div class="p-8">
          <div class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
            <span class="text-xs bg-green-600 text-white px-1 py-0.5 rounded">GET</span>
            <span class="text-sm">Get Users</span>
            <button
              ref={buttonRef}
              onClick={() => setIsOpen(!isOpen)}
              class="ml-auto text-sky-400 hover:text-sky-700"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>

          <ContextMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={buttonRef.current}
            items={requestMenuItems}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Many items
export const ManyItems = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);
      const buttonRef = useRef();

      const manyItems = [
        { label: 'Action 1', onClick: fn() },
        { label: 'Action 2', onClick: fn() },
        { label: 'Action 3', onClick: fn() },
        { divider: true },
        { label: 'Action 4', onClick: fn() },
        { label: 'Action 5', onClick: fn() },
        { label: 'Action 6', onClick: fn() },
        { label: 'Action 7', onClick: fn() },
        { divider: true },
        { label: 'Action 8', onClick: fn() },
        { label: 'Action 9', onClick: fn() },
        { label: 'Action 10', onClick: fn() },
      ];

      return (
        <div class="p-8">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
          >
            Many Items Menu
          </button>

          <ContextMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            trigger={buttonRef.current}
            items={manyItems}
          />
        </div>
      );
    };

    return <Example />;
  },
};

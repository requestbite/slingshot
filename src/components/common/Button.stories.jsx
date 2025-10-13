import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { Button } from './Button';

export default {
  title: 'Common/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'icon', 'danger', 'utility', 'success', 'none'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'icon'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
    },
    onClick: { action: 'onClick' },
  },
  args: {
    onClick: fn(),
  },
};

// Primary variant (all sizes)
export const Primary = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Primary Button',
  },
};

export const PrimarySmall = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Primary Small',
  },
};

export const PrimaryExtraSmall = {
  args: {
    variant: 'primary',
    size: 'xs',
    children: 'Primary XS',
  },
};

// Secondary variant
export const Secondary = {
  args: {
    variant: 'secondary',
    size: 'md',
    children: 'Secondary Button',
  },
};

export const SecondarySmall = {
  args: {
    variant: 'secondary',
    size: 'sm',
    children: 'Secondary Small',
  },
};

// Ghost variant (text-only)
export const Ghost = {
  args: {
    variant: 'ghost',
    size: 'md',
    children: 'Ghost Button',
  },
};

export const GhostSmall = {
  args: {
    variant: 'ghost',
    size: 'sm',
    children: 'Ghost Small',
  },
};

// Icon variant (square buttons)
export const IconButton = {
  args: {
    variant: 'icon',
    size: 'icon',
    children: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: 'Settings',
  },
};

export const IconButtonFolder = {
  args: {
    variant: 'icon',
    size: 'icon',
    children: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 10v6" />
        <path d="M9 13h6" />
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    ),
    title: 'Add folder to collection',
  },
};

export const IconButtonExport = {
  args: {
    variant: 'icon',
    size: 'icon',
    children: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: 'Export as Postman collection',
  },
};

// Danger variant (destructive actions)
export const Danger = {
  args: {
    variant: 'danger',
    size: 'md',
    children: 'Cancel Request',
  },
};

export const DangerSmall = {
  args: {
    variant: 'danger',
    size: 'sm',
    children: 'Delete',
  },
};

// Utility variant
export const Utility = {
  args: {
    variant: 'utility',
    size: 'md',
    children: (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
          <path d="m16 18 6-6-6-6" />
          <path d="m8 6-6 6 6 6" />
        </svg>
        Code
      </>
    ),
  },
};

// Success variant
export const Success = {
  args: {
    variant: 'success',
    size: 'md',
    children: 'Updated!',
  },
};

export const SuccessSmall = {
  args: {
    variant: 'success',
    size: 'xs',
    children: 'Make default',
  },
};

// None variant (no styling, use className for custom styling)
export const None = {
  args: {
    variant: 'none',
    className: 'px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600',
    children: 'Custom Styled Button',
  },
};

export const NoneMinimal = {
  args: {
    variant: 'none',
    className: 'text-blue-600 underline hover:text-blue-800',
    children: 'Link-style button',
  },
};

// Loading states
export const LoadingPrimary = {
  args: {
    variant: 'primary',
    size: 'md',
    loading: true,
    children: 'Creating...',
  },
};

export const LoadingSecondary = {
  args: {
    variant: 'secondary',
    size: 'md',
    loading: true,
    children: 'Loading...',
  },
};

export const LoadingDanger = {
  args: {
    variant: 'danger',
    size: 'md',
    loading: true,
    children: 'Deleting...',
  },
};

// Disabled states
export const DisabledPrimary = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
    children: 'Disabled Primary',
  },
};

export const DisabledSecondary = {
  args: {
    variant: 'secondary',
    size: 'md',
    disabled: true,
    children: 'Disabled Secondary',
  },
};

export const DisabledGhost = {
  args: {
    variant: 'ghost',
    size: 'md',
    disabled: true,
    children: 'Disabled Ghost',
  },
};

// Real-world examples
export const ModalFooter = {
  render: () => (
    <div class="sm:flex sm:flex-row-reverse space-x-reverse space-x-3">
      <Button variant="primary" size="md">
        Create
      </Button>
      <Button variant="secondary" size="md">
        Cancel
      </Button>
    </div>
  ),
};

export const FormButtons = {
  render: () => (
    <div class="flex items-center space-x-2">
      <Button variant="primary" size="sm">
        Send
      </Button>
      <Button variant="utility" size="sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m16 18 6-6-6-6" />
          <path d="m8 6-6 6 6 6" />
        </svg>
      </Button>
    </div>
  ),
};

export const IconButtonGroup = {
  render: () => (
    <div class="flex space-x-2">
      <Button variant="icon" size="icon" title="Collection settings">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Button>
      <Button variant="icon" size="icon" title="Add folder to collection">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 10v6" />
          <path d="M9 13h6" />
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
      </Button>
      <Button variant="icon" size="icon" title="Export as Postman collection">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </Button>
    </div>
  ),
};

export const TableActions = {
  render: () => (
    <div class="flex items-center space-x-3">
      <Button variant="ghost" size="sm">
        Edit
      </Button>
      <Button variant="ghost" size="sm">
        Copy
      </Button>
      <Button variant="ghost" size="sm">
        Delete...
      </Button>
    </div>
  ),
};

export const PageHeader = {
  render: () => (
    <div class="sm:flex sm:items-start p-6 bg-white rounded-lg border border-gray-300">
      <div class="sm:flex-auto">
        <h1 class="text-base/7 font-semibold text-gray-900">Collections</h1>
        <p class="mt-1 text-sm/6 text-gray-600">Manage your collections.</p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <Button variant="primary" size="md">
          Add Collection
        </Button>
      </div>
    </div>
  ),
};

// Interactive example with state management
export const Interactive = {
  render: () => {
    const InteractiveButtons = () => {
      const [loading, setLoading] = useState(false);
      const [disabled, setDisabled] = useState(false);
      const [variant, setVariant] = useState('primary');
      const [count, setCount] = useState(0);

      const handleClick = () => {
        setCount(count + 1);
      };

      const handleLoadingClick = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
      };

      return (
        <div class="space-y-6 max-w-2xl">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Controls</h3>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={disabled}
                  onChange={(e) => setDisabled(e.target.checked)}
                  class="rounded"
                />
                <span class="text-sm">Disabled</span>
              </label>
              <div class="flex items-center space-x-2">
                <span class="text-sm">Variant:</span>
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  class="rounded border-gray-300 text-sm"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="ghost">Ghost</option>
                  <option value="icon">Icon</option>
                  <option value="danger">Danger</option>
                  <option value="utility">Utility</option>
                  <option value="success">Success</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Click Counter</h3>
            <div class="flex items-center space-x-4">
              <Button
                variant={variant}
                size="md"
                disabled={disabled}
                onClick={handleClick}
              >
                Click me!
              </Button>
              <span class="text-sm text-gray-600">
                Clicked: <strong>{count}</strong> times
              </span>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Loading State</h3>
            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={handleLoadingClick}
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">All Sizes</h3>
            <div class="flex items-center space-x-3">
              <Button variant={variant} size="xs" disabled={disabled}>
                Extra Small
              </Button>
              <Button variant={variant} size="sm" disabled={disabled}>
                Small
              </Button>
              <Button variant={variant} size="md" disabled={disabled}>
                Medium
              </Button>
            </div>
          </div>
        </div>
      );
    };

    return <InteractiveButtons />;
  },
};

// All variants showcase
export const AllVariants = {
  render: () => (
    <div class="space-y-6 max-w-3xl">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Primary</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="primary" size="xs">Extra Small</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="md" loading>Loading...</Button>
          <Button variant="primary" size="md" disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Secondary</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="secondary" size="xs">Extra Small</Button>
          <Button variant="secondary" size="sm">Small</Button>
          <Button variant="secondary" size="md">Medium</Button>
          <Button variant="secondary" size="md" loading>Loading...</Button>
          <Button variant="secondary" size="md" disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Ghost</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="ghost" size="xs">Extra Small</Button>
          <Button variant="ghost" size="sm">Small</Button>
          <Button variant="ghost" size="md">Medium</Button>
          <Button variant="ghost" size="md" disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Icon</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="icon" size="icon" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Button>
          <Button variant="icon" size="icon" title="Add folder">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 10v6" />
              <path d="M9 13h6" />
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
          </Button>
          <Button variant="icon" size="icon" disabled title="Disabled">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 10v6" />
              <path d="M9 13h6" />
            </svg>
          </Button>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Danger</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="danger" size="xs">Extra Small</Button>
          <Button variant="danger" size="sm">Small</Button>
          <Button variant="danger" size="md">Medium</Button>
          <Button variant="danger" size="md" loading>Deleting...</Button>
          <Button variant="danger" size="md" disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Utility</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="utility" size="xs">Extra Small</Button>
          <Button variant="utility" size="sm">Small</Button>
          <Button variant="utility" size="md">Medium</Button>
          <Button variant="utility" size="md" disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Success</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="success" size="xs">Extra Small</Button>
          <Button variant="success" size="sm">Small</Button>
          <Button variant="success" size="md">Medium</Button>
          <Button variant="success" size="md" disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">None (Custom Styling)</h3>
        <div class="flex flex-wrap gap-3">
          <Button variant="none" className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium">Custom Purple</Button>
          <Button variant="none" className="text-blue-600 underline hover:text-blue-800">Link Style</Button>
          <Button variant="none" className="px-3 py-1 border-2 border-orange-500 text-orange-500 rounded-full hover:bg-orange-50 font-semibold">Custom Border</Button>
        </div>
      </div>
    </div>
  ),
};

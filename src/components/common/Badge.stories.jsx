import { Badge } from './Badge';

export default {
  title: 'Common/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'utility', 'success', 'none'],
    },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Ghost = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Danger',
  },
};

export const Utility = {
  args: {
    variant: 'utility',
    children: 'Utility',
  },
};

export const Success = {
  args: {
    variant: 'success',
    children: 'Success',
  },
};

export const None = {
  args: {
    variant: 'none',
    className: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700',
    children: 'Custom',
  },
};

// All variants showcase
export const AllVariants = {
  render: () => (
    <div class="flex flex-wrap gap-3">
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="utility">Utility</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="none" className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700">Custom</Badge>
    </div>
  ),
};

// Real-world usage examples
export const StatusBadges = {
  render: () => (
    <div class="space-y-4 max-w-sm">
      <div class="flex items-center justify-between p-3 rounded-md border border-gray-200">
        <span class="text-sm text-gray-700">GET /users</span>
        <Badge variant="success">200 OK</Badge>
      </div>
      <div class="flex items-center justify-between p-3 rounded-md border border-gray-200">
        <span class="text-sm text-gray-700">POST /auth/login</span>
        <Badge variant="danger">401 Unauthorized</Badge>
      </div>
      <div class="flex items-center justify-between p-3 rounded-md border border-gray-200">
        <span class="text-sm text-gray-700">DELETE /items/42</span>
        <Badge variant="primary">204 No Content</Badge>
      </div>
      <div class="flex items-center justify-between p-3 rounded-md border border-gray-200">
        <span class="text-sm text-gray-700">PUT /settings</span>
        <Badge variant="utility">Pending</Badge>
      </div>
    </div>
  ),
};

export const InlineText = {
  render: () => (
    <p class="text-sm text-gray-700 flex items-center gap-2">
      Authentication endpoint
      <Badge variant="ghost">Beta</Badge>
    </p>
  ),
};

export const CustomColorOverride = {
  render: () => (
    <div class="flex flex-wrap gap-3">
      <Badge className="bg-orange-100 text-orange-700">Orange</Badge>
      <Badge className="bg-violet-100 text-violet-700">Violet</Badge>
      <Badge variant="primary" className="bg-pink-500">Pink Override</Badge>
    </div>
  ),
};

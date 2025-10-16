import { ThemeSwitch } from './ThemeSwitch';

export default {
  title: 'Common/ThemeSwitch',
  component: ThemeSwitch,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' },
  },
};

// Default theme switch
export const Default = {
  args: {},
};

// With custom className
export const WithCustomStyling = {
  args: {
    className: 'border-2 border-sky-500',
  },
};

// In a toolbar-like context
export const InToolbar = {
  render: () => (
    <div className="flex items-center space-x-2 p-4 bg-gray-50 border border-gray-200 rounded-md">
      <span className="text-sm text-gray-600">Theme:</span>
      <ThemeSwitch />
      <span className="text-sm text-gray-600 ml-4">Version: 3.4.0</span>
    </div>
  ),
};

// Multiple switches
export const MultipleSwitches = {
  render: () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 w-24">Default:</span>
        <ThemeSwitch />
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 w-24">Custom:</span>
        <ThemeSwitch className="bg-sky-50 hover:bg-sky-100" />
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 w-24">Bordered:</span>
        <ThemeSwitch className="border border-gray-300" />
      </div>
    </div>
  ),
};

// In header context (similar to TopBar)
export const InHeader = {
  render: () => (
    <header className="h-16 bg-white border-b border-gray-300 flex items-center justify-between px-4">
      <div className="font-semibold text-gray-900">RequestBite Slingshot</div>
      <div className="flex items-center space-x-3">
        <ThemeSwitch />
        <a href="#" className="text-gray-600 hover:text-gray-400 text-sm">
          v3.4.0
        </a>
      </div>
    </header>
  ),
};

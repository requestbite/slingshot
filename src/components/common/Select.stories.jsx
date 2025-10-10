import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { Select } from './Select';

export default {
  title: 'Common/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['normal', 'small'],
    },
    onChange: { action: 'onChange' },
  },
  args: {
    onChange: fn(),
  },
};

const sampleOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
];

const environmentOptions = [
  { value: 'dev', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];

// Normal size with placeholder
export const Normal = {
  args: {
    value: '',
    options: sampleOptions,
    placeholder: 'Select an option...',
    size: 'normal',
  },
};

// Small size
export const Small = {
  args: {
    value: '',
    options: sampleOptions,
    placeholder: 'Select...',
    size: 'small',
  },
};

// With selected value
export const WithSelectedValue = {
  args: {
    value: 'option2',
    options: sampleOptions,
    placeholder: 'Select an option...',
    size: 'normal',
  },
};

// HTTP Methods
export const HTTPMethods = {
  args: {
    value: 'GET',
    options: methodOptions,
    placeholder: 'Method',
    size: 'normal',
  },
};

// Environments
export const Environments = {
  args: {
    value: 'dev',
    options: environmentOptions,
    placeholder: 'Select environment...',
    size: 'normal',
  },
};

// Disabled state
export const Disabled = {
  args: {
    value: 'option1',
    options: sampleOptions,
    placeholder: 'Select an option...',
    disabled: true,
    size: 'normal',
  },
};

// Loading state (disabled with no options)
export const Loading = {
  args: {
    value: '',
    options: [],
    placeholder: 'Loading...',
    disabled: true,
    size: 'normal',
  },
};

// Empty options
export const EmptyOptions = {
  args: {
    value: '',
    options: [],
    placeholder: 'No options available',
    disabled: false,
    size: 'normal',
  },
};

// Many options
export const ManyOptions = {
  args: {
    value: '',
    options: Array.from({ length: 50 }, (_, i) => ({
      value: `option${i + 1}`,
      label: `Option ${i + 1}`,
    })),
    placeholder: 'Select from many options...',
    size: 'normal',
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const InteractiveSelect = () => {
      const [selectedMethod, setSelectedMethod] = useState('GET');
      const [selectedEnv, setSelectedEnv] = useState('');

      return (
        <div class="space-y-6 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              HTTP Method
            </label>
            <Select
              value={selectedMethod}
              onChange={(value) => setSelectedMethod(value)}
              options={methodOptions}
              placeholder="Select method"
              size="normal"
            />
            <p class="mt-2 text-xs text-gray-500">
              Selected: <strong>{selectedMethod || 'None'}</strong>
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Environment (Small)
            </label>
            <Select
              value={selectedEnv}
              onChange={(value) => setSelectedEnv(value)}
              options={environmentOptions}
              placeholder="Select environment..."
              size="small"
            />
            <p class="mt-2 text-xs text-gray-500">
              Selected: <strong>{selectedEnv || 'None'}</strong>
            </p>
          </div>
        </div>
      );
    };

    return <InteractiveSelect />;
  },
};

// In a form context
export const InForm = {
  render: () => (
    <form class="max-w-md space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Request Method
        </label>
        <Select
          value="POST"
          onChange={fn()}
          options={methodOptions}
          size="normal"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Target Environment
        </label>
        <Select
          value=""
          onChange={fn()}
          options={environmentOptions}
          placeholder="Select environment..."
          size="normal"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Priority (Small)
        </label>
        <Select
          value="medium"
          onChange={fn()}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          size="small"
        />
      </div>

      <button
        type="submit"
        class="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 cursor-pointer"
      >
        Submit
      </button>
    </form>
  ),
};

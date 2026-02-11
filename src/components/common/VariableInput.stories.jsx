import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { VariableInput } from './VariableInput';
import { mockContextDecorator, withMockContext } from '../../stories/mocks/mockContext';
import { mockVariables } from '../../stories/mocks/mockData';

export default {
  title: 'Common/VariableInput',
  component: VariableInput,
  tags: ['autodocs'],
  decorators: [mockContextDecorator],
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    showResolved: { control: 'boolean' },
    inputType: {
      control: 'select',
      options: ['text', 'url'],
    },
    onChange: { action: 'onChange' },
  },
  args: {
    onChange: fn(),
  },
};

// Basic usage
export const Basic = {
  args: {
    value: '',
    placeholder: 'Enter value...',
    disabled: false,
  },
};

// With resolved variables
export const WithResolvedVariables = {
  args: {
    value: 'https://{{baseUrl}}/api/users?key={{apiKey}}',
    placeholder: 'Enter URL...',
    inputType: 'url',
  },
};

// With unresolved variables
export const WithUnresolvedVariables = {
  decorators: [
    withMockContext({
      selectedCollection: {
        variables: [
          { key: 'baseUrl', value: 'api.example.com' }
        ]
      }
    })
  ],
  args: {
    value: 'https://{{baseUrl}}/api/{{unknownVar}}',
    placeholder: 'Enter URL...',
    inputType: 'url',
  },
};

// URL input type
export const URLInput = {
  args: {
    value: 'https://{{baseUrl}}/v1/users/{{userId}}',
    placeholder: 'https://api.example.com',
    inputType: 'url',
  },
};

// Text input type
export const TextInput = {
  args: {
    value: 'Bearer {{token}}',
    placeholder: 'Enter authorization...',
    inputType: 'text',
  },
};

// Disabled state
export const Disabled = {
  args: {
    value: 'https://{{baseUrl}}/api',
    placeholder: 'Enter URL...',
    disabled: true,
  },
};

// Empty with placeholder
export const EmptyWithPlaceholder = {
  args: {
    value: '',
    placeholder: 'Type {{ to see available variables',
  },
};

// Interactive example with autocomplete
export const InteractiveAutocomplete = {
  render: () => {
    const Example = () => {
      const [value, setValue] = useState('');
      const [showResolved, setShowResolved] = useState(false);

      return (
        <div class="p-4 max-w-2xl">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            URL with Variable Autocomplete
          </label>
          <p class="text-xs text-gray-500 mb-3">
            Type <kbd class="px-1 py-0.5 bg-gray-100 rounded-sm text-xs">{'{{'}}</kbd> to trigger autocomplete.
            Available variables: baseUrl, apiKey, token, userId, version
          </p>
          <div class="mb-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                class="cursor-pointer"
              />
              <span class="text-sm text-gray-700">Show resolved value</span>
            </label>
          </div>
          <VariableInput
            value={value}
            onChange={(newValue) => setValue(newValue)}
            placeholder="https://example.com"
            inputType="url"
            showResolved={showResolved}
          />
          <div class="mt-3 p-3 bg-gray-50 rounded-md">
            <p class="text-xs font-medium text-gray-700">Current value:</p>
            <p class="text-xs text-gray-600 font-mono mt-1">{value || '(empty)'}</p>
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

// Multiple inputs in a form
export const InForm = {
  render: () => {
    const FormExample = () => {
      const [url, setUrl] = useState('https://{{baseUrl}}/api/v1');
      const [authHeader, setAuthHeader] = useState('Bearer {{token}}');
      const [customHeader, setCustomHeader] = useState('');

      return (
        <form class="p-4 max-w-2xl space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Request URL
            </label>
            <VariableInput
              value={url}
              onChange={setUrl}
              placeholder="https://api.example.com"
              inputType="url"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Authorization Header
            </label>
            <VariableInput
              value={authHeader}
              onChange={setAuthHeader}
              placeholder="Bearer token..."
              inputType="text"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Custom Header Value
            </label>
            <VariableInput
              value={customHeader}
              onChange={setCustomHeader}
              placeholder="Enter value or use {{variable}}"
              inputType="text"
            />
          </div>

          <button
            type="submit"
            class="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-400 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              console.log({ url, authHeader, customHeader });
            }}
          >
            Submit
          </button>
        </form>
      );
    };

    return <FormExample />;
  },
};

// Long value
export const LongValue = {
  args: {
    value: 'https://{{baseUrl}}/api/v1/users/{{userId}}/profiles/{{profileId}}/settings?include={{include}}&format={{format}}&timestamp={{timestamp}}',
    placeholder: 'Enter URL...',
    inputType: 'url',
  },
};

// Mixed resolved and unresolved
export const MixedVariables = {
  decorators: [
    withMockContext({
      selectedCollection: {
        variables: [
          { key: 'baseUrl', value: 'api.example.com' },
          { key: 'version', value: 'v1' }
        ]
      }
    })
  ],
  args: {
    value: 'https://{{baseUrl}}/{{version}}/users/{{userId}}',
    placeholder: 'Enter URL...',
    inputType: 'url',
  },
};

// No variables available
export const NoVariablesAvailable = {
  decorators: [
    withMockContext({
      selectedCollection: {
        variables: []
      }
    })
  ],
  args: {
    value: 'https://{{baseUrl}}/api',
    placeholder: 'Enter URL...',
    inputType: 'url',
  },
};

// With showResolved - all variables resolved
export const WithShowResolvedAllResolved = {
  args: {
    value: 'https://{{baseUrl}}/api/users?key={{apiKey}}',
    placeholder: 'Enter URL...',
    inputType: 'url',
    showResolved: true,
  },
};

// With showResolved - mixed resolved and unresolved
export const WithShowResolvedMixed = {
  decorators: [
    withMockContext({
      selectedCollection: {
        variables: [
          { key: 'baseUrl', value: 'api.example.com' },
          { key: 'version', value: 'v1' }
        ]
      }
    })
  ],
  args: {
    value: 'https://{{baseUrl}}/{{version}}/users/{{unknownVar}}',
    placeholder: 'Enter URL...',
    inputType: 'url',
    showResolved: true,
  },
};

// With showResolved - long value that gets truncated
export const WithShowResolvedLongValue = {
  args: {
    value: 'https://{{baseUrl}}/api/v1/users/{{userId}}/profiles/{{profileId}}/settings?include={{include}}&format={{format}}&timestamp={{timestamp}}&additional={{additional}}&more={{more}}',
    placeholder: 'Enter URL...',
    inputType: 'url',
    showResolved: true,
  },
};

// With showResolved - no variables (should not show resolved text)
export const WithShowResolvedNoVariables = {
  args: {
    value: 'https://api.example.com/users',
    placeholder: 'Enter URL...',
    inputType: 'url',
    showResolved: true,
  },
};

// Real-world API endpoint example
export const RealWorldExample = {
  render: () => {
    const Example = () => {
      const [endpoint, setEndpoint] = useState('https://{{baseUrl}}/api/{{version}}/users');
      const [showResolved, setShowResolved] = useState(true);

      return (
        <div class="p-4 max-w-2xl">
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">API Endpoint Builder</h3>
            <p class="text-sm text-gray-600">
              Build your API endpoint using variables. Variables are highlighted in green when resolved.
            </p>
          </div>

          <div class="bg-gray-50 p-4 rounded-md mb-4">
            <p class="text-xs font-medium text-gray-700 mb-2">Available Variables:</p>
            <ul class="text-xs text-gray-600 space-y-1">
              <li><code class="bg-white px-1 rounded-sm">baseUrl</code>: api.example.com</li>
              <li><code class="bg-white px-1 rounded-sm">version</code>: v1</li>
              <li><code class="bg-white px-1 rounded-sm">apiKey</code>: test-api-key-123</li>
              <li><code class="bg-white px-1 rounded-sm">token</code>: bearer-token-456</li>
              <li><code class="bg-white px-1 rounded-sm">userId</code>: 123</li>
            </ul>
          </div>

          <div class="mb-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                class="cursor-pointer"
              />
              <span class="text-sm text-gray-700">Show resolved value</span>
            </label>
          </div>

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Endpoint URL
          </label>
          <VariableInput
            value={endpoint}
            onChange={setEndpoint}
            placeholder="https://api.example.com/endpoint"
            inputType="url"
            showResolved={showResolved}
          />

          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p class="text-xs font-medium text-blue-900">Tip:</p>
            <p class="text-xs text-blue-700 mt-1">
              Type <code class="bg-white px-1 rounded-sm">{'{{'}}</code> anywhere to open the variable picker
            </p>
          </div>
        </div>
      );
    };

    return <Example />;
  },
};

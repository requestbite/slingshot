import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { TextInput } from './TextInput';

export default {
  title: 'Common/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'password', 'url', 'email'],
      description: 'Input type',
    },
    clearable: {
      control: 'boolean',
      description: 'Show clear button (X) when input has value',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
    required: {
      control: 'boolean',
      description: 'Mark input as required',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    value: {
      control: 'text',
      description: 'Input value',
    },
    onChange: { action: 'onChange' },
    onInput: { action: 'onInput' },
  },
  args: {
    onChange: fn(),
    onInput: fn(),
  },
};

// Basic text input
export const Basic = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    value: '',
  },
};

// Text input with value
export const WithValue = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    value: 'Sample text value',
  },
};

// Text input with clear button
export const TextWithClear = {
  render: () => {
    const TextWithClearComponent = () => {
      const [value, setValue] = useState('This text can be cleared');

      return (
        <div class="max-w-md">
          <TextInput
            type="text"
            placeholder="Enter text..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            clearable={true}
          />
        </div>
      );
    };

    return <TextWithClearComponent />;
  },
};

// Password input (basic)
export const Password = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
    value: 'secretpassword',
  },
};

// Password input with clear button
export const PasswordWithClear = {
  render: () => {
    const PasswordWithClearComponent = () => {
      const [value, setValue] = useState('secretpassword');

      return (
        <div class="max-w-md">
          <TextInput
            type="password"
            placeholder="Enter password..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            clearable={true}
          />
        </div>
      );
    };

    return <PasswordWithClearComponent />;
  },
};

// URL input
export const URL = {
  args: {
    type: 'url',
    placeholder: 'https://example.com',
    value: 'https://api.example.com/v1/users',
  },
};

// URL input with clear button
export const URLWithClear = {
  render: () => {
    const URLWithClearComponent = () => {
      const [value, setValue] = useState('https://api.example.com/v1/users');

      return (
        <div class="max-w-md">
          <TextInput
            type="url"
            placeholder="https://example.com"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            clearable={true}
          />
        </div>
      );
    };

    return <URLWithClearComponent />;
  },
};

// Email input
export const Email = {
  args: {
    type: 'email',
    placeholder: 'user@example.com',
    value: 'user@example.com',
  },
};

// Disabled states
export const DisabledEmpty = {
  args: {
    type: 'text',
    placeholder: 'Disabled input...',
    value: '',
    disabled: true,
  },
};

export const DisabledWithValue = {
  args: {
    type: 'text',
    placeholder: 'Disabled input...',
    value: 'This input is disabled',
    disabled: true,
  },
};

export const DisabledPassword = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
    value: 'secretpassword',
    disabled: true,
  },
};

// Required field
export const Required = {
  args: {
    type: 'text',
    placeholder: 'Required field...',
    value: '',
    required: true,
  },
};

// Interactive examples with state management
export const InteractiveText = {
  render: () => {
    const InteractiveTextInput = () => {
      const [value, setValue] = useState('');

      return (
        <div class="space-y-4 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Interactive Text Input
            </label>
            <TextInput
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type something..."
              clearable={true}
            />
            <p class="mt-2 text-xs text-gray-500">
              Current value: <code>{value || '(empty)'}</code>
            </p>
          </div>
        </div>
      );
    };

    return <InteractiveTextInput />;
  },
};

export const InteractivePassword = {
  render: () => {
    const InteractivePasswordInput = () => {
      const [password, setPassword] = useState('mysecretpassword');

      return (
        <div class="space-y-4 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Interactive Password Input
            </label>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
            />
            <p class="mt-2 text-xs text-gray-500">
              Password length: <code>{password.length} characters</code>
            </p>
          </div>
        </div>
      );
    };

    return <InteractivePasswordInput />;
  },
};

export const InteractivePasswordWithClear = {
  render: () => {
    const InteractivePasswordWithClearInput = () => {
      const [password, setPassword] = useState('mysecretpassword');

      return (
        <div class="space-y-4 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Password with Both Icons
            </label>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              clearable={true}
            />
            <p class="mt-2 text-xs text-gray-500">
              Both eye icon and clear button are visible. They are grouped to the right, with the clear button (X) on the left and the eye icon on the right.
            </p>
            <p class="mt-1 text-xs text-gray-500">
              Password: <code>{password || '(empty)'}</code>
            </p>
          </div>
        </div>
      );
    };

    return <InteractivePasswordWithClearInput />;
  },
};

// Form example
export const FormExample = {
  render: () => {
    const FormExampleComponent = () => {
      const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        website: '',
      });

      const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        alert('Form submitted! Check console for values.');
        console.log('Form data:', formData);
      };

      return (
        <form onSubmit={handleSubmit} class="space-y-4 max-w-md bg-white p-6 rounded-lg border border-gray-300">
          <h3 class="text-base font-semibold text-gray-900 mb-4">User Registration</h3>

          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
              Username <span class="text-red-500">*</span>
            </label>
            <TextInput
              id="username"
              type="text"
              value={formData.username}
              onChange={handleChange('username')}
              placeholder="Enter username"
              required
              clearable
            />
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email <span class="text-red-500">*</span>
            </label>
            <TextInput
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="user@example.com"
              required
              clearable
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Password <span class="text-red-500">*</span>
            </label>
            <TextInput
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="Enter password"
              required
              clearable
            />
            <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters long.</p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span class="text-red-500">*</span>
            </label>
            <TextInput
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              placeholder="Confirm password"
              required
            />
          </div>

          <div>
            <label for="website" class="block text-sm font-medium text-gray-700 mb-1">
              Website (optional)
            </label>
            <TextInput
              id="website"
              type="url"
              value={formData.website}
              onChange={handleChange('website')}
              placeholder="https://example.com"
              clearable
            />
          </div>

          <div class="pt-2">
            <button
              type="submit"
              class="w-full rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 cursor-pointer"
            >
              Register
            </button>
          </div>
        </form>
      );
    };

    return <FormExampleComponent />;
  },
};

// All variations showcase
export const AllVariations = {
  render: () => (
    <div class="space-y-8 max-w-3xl">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Text Inputs</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Basic text</label>
            <TextInput type="text" placeholder="Enter text..." value="" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Text with value</label>
            <TextInput type="text" placeholder="Enter text..." value="Sample text" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Text with clear button</label>
            <TextInput type="text" placeholder="Enter text..." value="Clearable text" clearable />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Disabled text</label>
            <TextInput type="text" placeholder="Disabled..." value="Disabled input" disabled />
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Password Inputs</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Password (with eye icon)</label>
            <TextInput type="password" placeholder="Enter password..." value="mysecretpassword" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Password with clear button</label>
            <TextInput type="password" placeholder="Enter password..." value="mysecretpassword" clearable />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Empty password</label>
            <TextInput type="password" placeholder="Enter password..." value="" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Disabled password</label>
            <TextInput type="password" placeholder="Enter password..." value="mysecretpassword" disabled />
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">URL Inputs</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">URL</label>
            <TextInput type="url" placeholder="https://example.com" value="https://api.example.com/v1" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">URL with clear button</label>
            <TextInput type="url" placeholder="https://example.com" value="https://api.example.com/v1" clearable />
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Email Inputs</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Email</label>
            <TextInput type="email" placeholder="user@example.com" value="user@example.com" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Email with clear button</label>
            <TextInput type="email" placeholder="user@example.com" value="user@example.com" clearable />
          </div>
        </div>
      </div>
    </div>
  ),
};

// Responsive behavior
export const ResponsiveLayout = {
  render: () => (
    <div class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <TextInput type="text" placeholder="John" value="" clearable />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <TextInput type="text" placeholder="Doe" value="" clearable />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <TextInput type="email" placeholder="john@example.com" value="" clearable />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <TextInput type="text" placeholder="+1 (555) 000-0000" value="" clearable />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <TextInput type="url" placeholder="https://example.com" value="" clearable />
        </div>
      </div>
    </div>
  ),
};

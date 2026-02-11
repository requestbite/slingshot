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
      options: ['text', 'password', 'url', 'email', 'textarea', 'file'],
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
    description: {
      control: 'text',
      description: 'Optional description text shown below the input',
    },
    rows: {
      control: 'number',
      description: 'Number of rows for textarea (default: 3)',
    },
    accept: {
      control: 'text',
      description: 'Accepted file types for file input (e.g., ".pdf,.doc,.docx" or "image/*")',
    },
    multiple: {
      control: 'boolean',
      description: 'Allow multiple file selection for file input',
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

// Text input with description
export const WithDescription = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    value: 'Sample text',
    description: 'This is a helpful description that appears below the input field.',
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
            description="Click the X icon to clear the input"
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
    description: 'Click the eye icon to toggle password visibility',
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
            description="Password must be at least 8 characters long"
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
    description: 'Enter a valid URL including the protocol (http:// or https://)',
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
    description: 'We\'ll never share your email with anyone else',
  },
};

// Textarea inputs
export const Textarea = {
  args: {
    type: 'textarea',
    placeholder: 'Enter your message...',
    value: 'This is a textarea field that supports multiple lines of text. It uses the same styling as other inputs.',
    description: 'Enter a detailed message (maximum 500 characters)',
  },
};

export const TextareaWithRows = {
  args: {
    type: 'textarea',
    placeholder: 'Enter your message...',
    value: 'This textarea has 5 rows.',
    rows: 5,
    description: 'Custom row count for larger text areas',
  },
};

export const TextareaEmpty = {
  args: {
    type: 'textarea',
    placeholder: 'Start typing...',
    value: '',
    description: 'Empty textarea ready for input',
  },
};

export const InteractiveTextarea = {
  render: () => {
    const InteractiveTextareaComponent = () => {
      const [value, setValue] = useState('This is an interactive textarea.\nYou can edit this text and see the character count update below.');

      return (
        <div class="space-y-4 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Interactive Textarea
            </label>
            <TextInput
              type="textarea"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type something..."
              rows={5}
              description="Type or edit the text to see the character count update"
            />
            <p class="mt-2 text-xs text-gray-700 font-mono bg-gray-100 p-2 rounded-sm">
              Character count: <code>{value.length}</code>
            </p>
          </div>
        </div>
      );
    };

    return <InteractiveTextareaComponent />;
  },
};

// File inputs
export const FileInput = {
  args: {
    type: 'file',
    description: 'Select a file to upload',
  },
};

export const FileInputWithAccept = {
  args: {
    type: 'file',
    accept: '.yaml,.yml,.json',
    description: 'Only YAML and JSON files are accepted',
  },
};

export const FileInputMultiple = {
  args: {
    type: 'file',
    multiple: true,
    description: 'You can select multiple files',
  },
};

export const FileInputImages = {
  args: {
    type: 'file',
    accept: 'image/*',
    description: 'Only image files are accepted',
  },
};

export const InteractiveFileInput = {
  render: () => {
    const InteractiveFileInputComponent = () => {
      const [selectedFile, setSelectedFile] = useState(null);

      const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file || null);
      };

      return (
        <div class="space-y-4 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Upload OpenAPI Specification
            </label>
            <TextInput
              type="file"
              onChange={handleFileChange}
              accept=".yaml,.yml,.json"
              description="Select a YAML or JSON file to upload"
            />
            {selectedFile && (
              <div class="mt-2 text-xs text-gray-700 font-mono bg-gray-100 p-2 rounded-sm">
                <div><strong>File name:</strong> {selectedFile.name}</div>
                <div><strong>File size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</div>
                <div><strong>File type:</strong> {selectedFile.type || 'unknown'}</div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return <InteractiveFileInputComponent />;
  },
};

export const InteractiveMultipleFiles = {
  render: () => {
    const InteractiveMultipleFilesComponent = () => {
      const [selectedFiles, setSelectedFiles] = useState([]);

      const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(files);
      };

      return (
        <div class="space-y-4 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Upload Multiple Images
            </label>
            <TextInput
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              multiple
              description="Select one or more image files"
            />
            {selectedFiles.length > 0 && (
              <div class="mt-2 text-xs text-gray-700 font-mono bg-gray-100 p-2 rounded-sm">
                <div class="mb-1"><strong>Selected files ({selectedFiles.length}):</strong></div>
                <ul class="list-disc list-inside pl-2">
                  {selectedFiles.map((file, index) => (
                    <li key={index}>
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    };

    return <InteractiveMultipleFilesComponent />;
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

export const DisabledFile = {
  args: {
    type: 'file',
    disabled: true,
    description: 'This file input is disabled',
  },
};

// Required field
export const Required = {
  args: {
    type: 'text',
    placeholder: 'Required field...',
    value: '',
    required: true,
    description: 'This field is required and must not be empty',
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
              description="Start typing to see the value update in real-time below"
            />
            <p class="mt-2 text-xs text-gray-700 font-mono bg-gray-100 p-2 rounded-sm">
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
              description="Password must contain at least one uppercase letter, one number, and one special character"
            />
            <p class="mt-2 text-xs text-gray-700 font-mono bg-gray-100 p-2 rounded-sm">
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
              description="Both eye icon and clear button are visible. The clear button (X) is on the left and the eye icon is on the right."
            />
            <p class="mt-2 text-xs text-gray-700 font-mono bg-gray-100 p-2 rounded-sm">
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
              description="Choose a unique username between 3-20 characters"
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
              description="We'll send a verification link to this email"
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
              description="Must be at least 8 characters long and include a number"
            />
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
              description="Re-enter your password to confirm"
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
              description="Enter your personal or company website URL"
            />
          </div>

          <div class="pt-2">
            <button
              type="submit"
              class="w-full rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 cursor-pointer"
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

// Description showcase
export const DescriptionShowcase = {
  render: () => (
    <div class="space-y-8 max-w-2xl">
      <div>
        <h3 class="text-base font-semibold text-gray-900 mb-4">Input with Description Examples</h3>
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Without description</label>
            <TextInput type="text" placeholder="Enter text..." value="No description here" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">With short description</label>
            <TextInput
              type="text"
              placeholder="Enter text..."
              value="Short description"
              description="A brief helpful hint"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">With longer description</label>
            <TextInput
              type="text"
              placeholder="Enter text..."
              value="Longer description"
              description="This is a longer description that provides more detailed information about what the user should enter in this field."
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password with description</label>
            <TextInput
              type="password"
              placeholder="Enter password..."
              value="mysecretpassword"
              description="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password with clear and description</label>
            <TextInput
              type="password"
              placeholder="Enter password..."
              value="mysecretpassword"
              clearable
              description="Click the X to clear or the eye icon to toggle visibility"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL with description</label>
            <TextInput
              type="url"
              placeholder="https://example.com"
              value="https://api.example.com"
              clearable
              description="Enter the full URL including the protocol (http:// or https://)"
            />
          </div>
        </div>
      </div>
    </div>
  ),
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

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Textarea Inputs</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Textarea (3 rows default)</label>
            <TextInput type="textarea" placeholder="Enter text..." value="This is a textarea with default 3 rows." />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Textarea (5 rows)</label>
            <TextInput type="textarea" placeholder="Enter text..." value="This is a textarea with 5 rows for more space." rows={5} />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Disabled textarea</label>
            <TextInput type="textarea" placeholder="Disabled..." value="This textarea is disabled" disabled />
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">File Inputs</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">Basic file input</label>
            <TextInput type="file" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">File input with accept filter</label>
            <TextInput type="file" accept=".yaml,.yml,.json" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Multiple files</label>
            <TextInput type="file" multiple />
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">Disabled file input</label>
            <TextInput type="file" disabled />
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

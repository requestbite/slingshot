import { Label } from './Label';
import { TextInput } from './TextInput';

export default {
  title: 'Common/Label',
  component: Label,
  argTypes: {
    children: {
      control: 'text',
      description: 'The label text content',
      defaultValue: 'Label text',
    },
    htmlFor: {
      control: 'text',
      description: 'The ID of the form element this label is associated with',
    },
    mandatory: {
      control: 'boolean',
      description: 'Whether to show a red asterisk indicating a required field',
      defaultValue: false,
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

// Default label
export const Default = {
  args: {
    children: 'Email address',
    htmlFor: 'email',
  },
};

// Mandatory label with red asterisk
export const Mandatory = {
  args: {
    children: 'Password',
    htmlFor: 'password',
    mandatory: true,
  },
};

// Label with associated input
export const WithInput = {
  render: (args) => (
    <div class="max-w-md">
      <Label htmlFor="username" mandatory={true}>
        Username
      </Label>
      <TextInput
        id="username"
        placeholder="Enter your username"
      />
    </div>
  ),
};

// Multiple labels showing mandatory and optional fields
export const FormExample = {
  render: () => (
    <div class="max-w-md space-y-4">
      <div>
        <Label htmlFor="name" mandatory={true}>
          Full Name
        </Label>
        <TextInput
          id="name"
          placeholder="John Doe"
        />
      </div>

      <div>
        <Label htmlFor="email" mandatory={true}>
          Email Address
        </Label>
        <TextInput
          id="email"
          type="email"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <Label htmlFor="phone">
          Phone Number
        </Label>
        <TextInput
          id="phone"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="company">
          Company
        </Label>
        <TextInput
          id="company"
          placeholder="Acme Inc."
        />
      </div>
    </div>
  ),
};

// Showcase of different states
export const Showcase = {
  render: () => (
    <div class="space-y-6 max-w-md">
      <div>
        <h3 class="text-lg font-semibold mb-4">Label Variations</h3>

        <div class="space-y-4">
          <div>
            <Label htmlFor="field1">
              Optional Field
            </Label>
            <TextInput id="field1" placeholder="Not required" />
          </div>

          <div>
            <Label htmlFor="field2" mandatory={true}>
              Required Field
            </Label>
            <TextInput id="field2" placeholder="Required" />
          </div>

          <div>
            <Label htmlFor="field3" mandatory={true}>
              Password Field
            </Label>
            <TextInput id="field3" type="password" placeholder="Enter password" />
          </div>

          <div>
            <Label htmlFor="field4" className="text-sky-600">
              Custom Styled Label
            </Label>
            <TextInput id="field4" placeholder="Custom style" />
          </div>
        </div>
      </div>
    </div>
  ),
};

// Interactive playground
export const Interactive = {
  args: {
    children: 'Label text',
    htmlFor: 'interactive-field',
    mandatory: false,
  },
  render: (args) => (
    <div class="max-w-md">
      <Label {...args} />
      <TextInput
        id={args.htmlFor}
        placeholder="Type something..."
      />
    </div>
  ),
};

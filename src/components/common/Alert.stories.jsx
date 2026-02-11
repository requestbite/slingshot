import { Alert } from './Alert';

export default {
  title: 'Common/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['note', 'tip', 'important', 'warning', 'caution'],
      description: 'The type of alert to display',
      defaultValue: 'note',
    },
    children: {
      control: 'text',
      description: 'The content of the alert',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

// Note alert (blue)
export const Note = {
  args: {
    type: 'note',
    children: 'This is a note alert. Use it to provide helpful information or context to the user.',
  },
};

// Tip alert (green)
export const Tip = {
  args: {
    type: 'tip',
    children: 'This is a tip alert. Use it to share helpful advice or best practices.',
  },
};

// Important alert (purple)
export const Important = {
  args: {
    type: 'important',
    children: 'This is an important alert. Use it to highlight critical information that users should not miss.',
  },
};

// Warning alert (amber/orange)
export const Warning = {
  args: {
    type: 'warning',
    children: 'This is a warning alert. Use it to caution users about potential issues or consequences.',
  },
};

// Caution alert (red)
export const Caution = {
  args: {
    type: 'caution',
    children: 'This is a caution alert. Use it for critical warnings or to indicate dangerous actions.',
  },
};

// Alert with longer content
export const LongContent = {
  args: {
    type: 'note',
    children: 'This alert demonstrates how the component handles longer text content. The alert will expand vertically to accommodate multiple lines of text while maintaining proper spacing and alignment between the icon and the content. You can include as much text as needed.',
  },
};

// Alert with rich content (JSX)
export const RichContent = {
  args: {
    type: 'important',
    children: (
      <div>
        <p class="font-semibold mb-1">Important Configuration Required</p>
        <p>Please ensure the following settings are configured:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>API endpoint URL</li>
          <li>Authentication credentials</li>
          <li>Request timeout settings</li>
        </ul>
      </div>
    ),
  },
};

// Alert with inline code
export const WithCode = {
  args: {
    type: 'tip',
    children: (
      <div>
        To use environment variables in your request, wrap them in double curly braces like <code class="bg-green-100 px-1.5 py-0.5 rounded-sm text-sm font-mono">{'{{variable_name}}'}</code>.
      </div>
    ),
  },
};

// Alert with link
export const WithLink = {
  args: {
    type: 'warning',
    children: (
      <div>
        Some data, including your client secret, will pass through the proxy when exchanging the auth code for an access token. <a href="#" class="underline hover:no-underline font-medium">Learn more</a>
      </div>
    ),
  },
};

// All alert types showcase
export const AllTypes = {
  render: () => (
    <div class="space-y-4 max-w-2xl">
      <Alert type="note">
        <strong>Note:</strong> This is a note alert for providing helpful information.
      </Alert>

      <Alert type="tip">
        <strong>Tip:</strong> This is a tip alert for sharing best practices.
      </Alert>

      <Alert type="important">
        <strong>Important:</strong> This is an important alert for critical information.
      </Alert>

      <Alert type="warning">
        <strong>Warning:</strong> This is a warning alert for potential issues.
      </Alert>

      <Alert type="caution">
        <strong>Caution:</strong> This is a caution alert for critical warnings.
      </Alert>
    </div>
  ),
};

// Real-world usage examples
export const UsageExamples = {
  render: () => (
    <div class="space-y-6 max-w-3xl">
      <div>
        <h3 class="text-lg font-semibold mb-3">Authentication Flow</h3>
        <Alert type="note">
          Please note that some data, including your client secret, will pass through the proxy when exchanging the auth code for an access token.
        </Alert>
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-3">API Configuration</h3>
        <Alert type="tip">
          <div>
            <p class="font-medium mb-1">Pro tip: Use environment variables</p>
            <p>Store your API keys and secrets as environment variables to keep them secure and make it easier to switch between environments.</p>
          </div>
        </Alert>
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-3">Security Notice</h3>
        <Alert type="important">
          <div>
            <p class="font-medium mb-1">Two-factor authentication required</p>
            <p>Starting next month, two-factor authentication will be required for all accounts. Please enable it in your account settings.</p>
          </div>
        </Alert>
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-3">Rate Limiting</h3>
        <Alert type="warning">
          You are approaching your API rate limit (450/500 requests). Consider implementing request caching or upgrading your plan.
        </Alert>
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-3">Destructive Action</h3>
        <Alert type="caution">
          <div>
            <p class="font-medium mb-1">This action cannot be undone</p>
            <p>Deleting this collection will permanently remove all requests, folders, and associated data. This action is irreversible.</p>
          </div>
        </Alert>
      </div>
    </div>
  ),
};

// Interactive playground
export const Interactive = {
  args: {
    type: 'note',
    children: 'This is an interactive alert. Use the controls to change its type and content.',
  },
};

// Stacked alerts
export const StackedAlerts = {
  render: () => (
    <div class="space-y-3 max-w-2xl">
      <Alert type="caution">
        <strong>Action Required:</strong> Your session will expire in 5 minutes.
      </Alert>
      <Alert type="warning">
        <strong>Warning:</strong> Unsaved changes will be lost.
      </Alert>
      <Alert type="tip">
        <strong>Tip:</strong> Use Cmd+S to save your work.
      </Alert>
    </div>
  ),
};

// Custom styling example
export const CustomStyling = {
  args: {
    type: 'important',
    className: 'shadow-md',
    children: 'This alert has custom styling applied via the className prop.',
  },
};

import { fn } from 'storybook/test';
import { Toast } from './Toast';

export default {
  title: 'Common/Toast',
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' },
    isVisible: { control: 'boolean' },
    duration: { control: 'number' },
    type: {
      control: 'select',
      options: ['success', 'error', 'info'],
    },
    onClose: { action: 'onClose' },
  },
  args: {
    onClose: fn(),
  },
};

// Success toast
export const Success = {
  args: {
    message: 'Operation completed successfully!',
    isVisible: true,
    type: 'success',
    duration: 3000,
  },
};

// Error toast
export const Error = {
  args: {
    message: 'An error occurred while processing your request.',
    isVisible: true,
    type: 'error',
    duration: 3000,
  },
};

// Info toast
export const Info = {
  args: {
    message: 'This is an informational message.',
    isVisible: true,
    type: 'info',
    duration: 3000,
  },
};

// Long message
export const LongMessage = {
  args: {
    message: 'This is a much longer message that demonstrates how the toast component handles extended text content. It should wrap appropriately and maintain good readability.',
    isVisible: true,
    type: 'success',
    duration: 5000,
  },
};

// Hidden (not visible)
export const Hidden = {
  args: {
    message: 'You should not see this message',
    isVisible: false,
    type: 'success',
    duration: 3000,
  },
};

// Short duration
export const ShortDuration = {
  args: {
    message: 'This toast will disappear quickly!',
    isVisible: true,
    type: 'info',
    duration: 1000,
  },
};

// Custom styling example
export const AllTypes = {
  render: () => (
    <div class="space-y-4">
      <Toast
        message="Success: Your changes have been saved"
        isVisible={true}
        type="success"
        duration={10000}
        onClose={fn()}
      />
      <div style={{ marginTop: '80px' }}>
        <Toast
          message="Error: Unable to connect to server"
          isVisible={true}
          type="error"
          duration={10000}
          onClose={fn()}
        />
      </div>
      <div style={{ marginTop: '160px' }}>
        <Toast
          message="Info: New features are available"
          isVisible={true}
          type="info"
          duration={10000}
          onClose={fn()}
        />
      </div>
    </div>
  ),
};

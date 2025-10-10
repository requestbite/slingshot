import { WelcomeMessage } from './WelcomeMessage';

export default {
  title: 'Common/WelcomeMessage',
  component: WelcomeMessage,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

// Default welcome message
export const Default = {
  render: () => <WelcomeMessage />,
};

// In a container
export const InContainer = {
  render: () => (
    <div class="bg-white p-8 rounded-lg shadow-md max-w-2xl">
      <WelcomeMessage />
    </div>
  ),
};

// Full page view
export const FullPage = {
  render: () => (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <WelcomeMessage />
    </div>
  ),
};

// With different background
export const DarkBackground = {
  render: () => (
    <div class="min-h-screen bg-gray-900 flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-xl p-8">
        <WelcomeMessage />
      </div>
    </div>
  ),
};

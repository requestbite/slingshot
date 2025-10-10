import { TopBar } from './TopBar';
import { mockRouterDecorator, withMockRouter } from '../../stories/mocks/mockRouter';

export default {
  title: 'Layout/TopBar',
  component: TopBar,
  tags: ['autodocs'],
  decorators: [mockRouterDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

// Default top bar (home page)
export const Default = {
  render: () => <TopBar />,
};

// On collections page
export const OnCollectionsPage = {
  decorators: [withMockRouter('/collections')],
  render: () => <TopBar />,
};

// On environments page
export const OnEnvironmentsPage = {
  decorators: [withMockRouter('/environments')],
  render: () => <TopBar />,
};

// On settings page
export const OnSettingsPage = {
  decorators: [withMockRouter('/settings')],
  render: () => <TopBar />,
};

// On collection page
export const OnCollectionPage = {
  decorators: [withMockRouter('/col-1')],
  render: () => <TopBar />,
};

// On request page
export const OnRequestPage = {
  decorators: [withMockRouter('/col-1/req-1')],
  render: () => <TopBar />,
};

// Full page context
export const FullPageContext = {
  render: () => (
    <div class="min-h-screen bg-gray-50">
      <TopBar />
      <div class="p-8">
        <h1 class="text-2xl font-bold mb-4">Page Content</h1>
        <p class="text-gray-600">
          This demonstrates the TopBar in a full page context.
        </p>
      </div>
    </div>
  ),
};

// With mobile menu (requires interaction)
export const MobileView = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => (
    <div class="min-h-screen bg-gray-50">
      <TopBar />
      <div class="p-4">
        <p class="text-sm text-gray-600">
          Click the menu icon to open the mobile menu
        </p>
      </div>
    </div>
  ),
};

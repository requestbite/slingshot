import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { Tabs } from './Tabs';

export default {
  title: 'Common/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    onTabChange: { action: 'onTabChange' },
  },
  args: {
    onTabChange: fn(),
  },
};

const defaultTabs = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'settings', label: 'Settings' },
];

export const Default = {
  args: {
    tabs: defaultTabs,
    activeTab: 'params',
  },
};

export const SecondTabActive = {
  args: {
    tabs: defaultTabs,
    activeTab: 'headers',
  },
};

export const WithDisabledTab = {
  args: {
    tabs: [
      { id: 'params', label: 'Params' },
      { id: 'headers', label: 'Headers' },
      { id: 'body', label: 'Body', disabled: true },
      { id: 'settings', label: 'Settings' },
    ],
    activeTab: 'params',
  },
};

export const AllDisabled = {
  args: {
    tabs: [
      { id: 'one', label: 'One', disabled: true },
      { id: 'two', label: 'Two', disabled: true },
      { id: 'three', label: 'Three', disabled: true },
    ],
    activeTab: 'one',
  },
};

export const TwoTabs = {
  args: {
    tabs: [
      { id: 'preview', label: 'Preview' },
      { id: 'code', label: 'Code' },
    ],
    activeTab: 'preview',
  },
};

export const Interactive = {
  render: () => {
    const InteractiveTabs = () => {
      const tabs = [
        { id: 'params', label: 'Params' },
        { id: 'headers', label: 'Headers' },
        { id: 'body', label: 'Body' },
        { id: 'disabled', label: 'Disabled', disabled: true },
        { id: 'settings', label: 'Settings' },
      ];

      const [activeTab, setActiveTab] = useState('params');

      return (
        <div class="space-y-4">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <div class="px-4 py-2 text-sm text-gray-600">
            Active tab: <strong>{activeTab}</strong>
          </div>
        </div>
      );
    };

    return <InteractiveTabs />;
  },
};

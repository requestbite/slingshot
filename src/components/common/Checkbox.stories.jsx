import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { Checkbox } from './Checkbox';

export default {
  title: 'Common/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    onChange: { action: 'onChange' },
  },
  args: {
    onChange: fn(),
  },
};

// Basic checkbox without label
export const Default = {
  args: {
    checked: false,
  },
};

// Checkbox with label
export const WithLabel = {
  args: {
    checked: false,
    label: 'Accept terms and conditions',
  },
};

// Checked state
export const Checked = {
  args: {
    checked: true,
    label: 'Remember me',
  },
};

// Disabled unchecked
export const DisabledUnchecked = {
  args: {
    checked: false,
    disabled: true,
    label: 'Disabled option',
  },
};

// Disabled checked
export const DisabledChecked = {
  args: {
    checked: true,
    disabled: true,
    label: 'Already completed',
  },
};

// Multiple checkboxes group
export const CheckboxGroup = {
  render: () => (
    <div class="space-y-3">
      <Checkbox label="Email notifications" />
      <Checkbox label="Push notifications" checked />
      <Checkbox label="SMS notifications" />
      <Checkbox label="Newsletter" checked />
    </div>
  ),
};

// Form example
export const FormExample = {
  render: () => (
    <div class="max-w-md p-6 bg-white rounded-lg border border-gray-300">
      <h3 class="text-base font-semibold text-gray-900 mb-4">
        Notification Preferences
      </h3>
      <div class="space-y-3">
        <Checkbox label="Email me when someone comments" checked />
        <Checkbox label="Email me when someone follows me" />
        <Checkbox label="Email me about product updates" checked />
        <Checkbox label="Email me about promotional offers" />
      </div>
    </div>
  ),
};

// Settings panel example
export const SettingsPanel = {
  render: () => (
    <div class="max-w-2xl p-6 bg-white rounded-lg border border-gray-300">
      <h2 class="text-lg font-semibold text-gray-900 mb-6">Privacy Settings</h2>

      <div class="space-y-6">
        <div>
          <h3 class="text-sm font-medium text-gray-900 mb-3">Profile Visibility</h3>
          <div class="space-y-2 pl-1">
            <Checkbox label="Make my profile public" checked />
            <Checkbox label="Show my email address" />
            <Checkbox label="Allow others to see my activity" checked />
          </div>
        </div>

        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Data Collection</h3>
          <div class="space-y-2 pl-1">
            <Checkbox label="Allow analytics tracking" checked />
            <Checkbox label="Share usage data" />
            <Checkbox label="Enable crash reporting" checked />
          </div>
        </div>

        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Required</h3>
          <div class="space-y-2 pl-1">
            <Checkbox label="I agree to the Terms of Service" checked disabled />
            <Checkbox label="I agree to the Privacy Policy" checked disabled />
          </div>
        </div>
      </div>
    </div>
  ),
};

// Interactive example with state
export const Interactive = {
  render: () => {
    const InteractiveCheckboxes = () => {
      const [checkboxes, setCheckboxes] = useState({
        option1: false,
        option2: true,
        option3: false,
        option4: true,
      });

      const handleChange = (key) => (e) => {
        setCheckboxes({
          ...checkboxes,
          [key]: e.target.checked,
        });
      };

      const checkedCount = Object.values(checkboxes).filter(Boolean).length;

      return (
        <div class="max-w-md space-y-6">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">
              Select Features ({checkedCount} selected)
            </h3>
            <div class="space-y-3">
              <Checkbox
                label="Feature A - Advanced analytics"
                checked={checkboxes.option1}
                onChange={handleChange('option1')}
              />
              <Checkbox
                label="Feature B - Real-time updates"
                checked={checkboxes.option2}
                onChange={handleChange('option2')}
              />
              <Checkbox
                label="Feature C - Export functionality"
                checked={checkboxes.option3}
                onChange={handleChange('option3')}
              />
              <Checkbox
                label="Feature D - Priority support"
                checked={checkboxes.option4}
                onChange={handleChange('option4')}
              />
            </div>
          </div>

          <div class="p-4 bg-gray-50 rounded-md">
            <h4 class="text-xs font-semibold text-gray-700 mb-2">Selected Features:</h4>
            <ul class="text-xs text-gray-600 space-y-1">
              {checkboxes.option1 && <li>• Advanced analytics</li>}
              {checkboxes.option2 && <li>• Real-time updates</li>}
              {checkboxes.option3 && <li>• Export functionality</li>}
              {checkboxes.option4 && <li>• Priority support</li>}
              {checkedCount === 0 && <li class="text-gray-400">No features selected</li>}
            </ul>
          </div>
        </div>
      );
    };

    return <InteractiveCheckboxes />;
  },
};

// Select all example
export const SelectAllExample = {
  render: () => {
    const SelectAllComponent = () => {
      const [items, setItems] = useState([
        { id: 1, label: 'Item 1', checked: false },
        { id: 2, label: 'Item 2', checked: true },
        { id: 3, label: 'Item 3', checked: false },
        { id: 4, label: 'Item 4', checked: false },
      ]);

      const allChecked = items.every(item => item.checked);
      const someChecked = items.some(item => item.checked) && !allChecked;

      const handleSelectAll = (e) => {
        const checked = e.target.checked;
        setItems(items.map(item => ({ ...item, checked })));
      };

      const handleItemChange = (id) => (e) => {
        const checked = e.target.checked;
        setItems(items.map(item =>
          item.id === id ? { ...item, checked } : item
        ));
      };

      return (
        <div class="max-w-md p-4 bg-white rounded-lg border border-gray-300">
          <div class="pb-3 border-b border-gray-200">
            <Checkbox
              label="Select All"
              checked={allChecked}
              onChange={handleSelectAll}
              className="font-medium"
            />
          </div>
          <div class="pt-3 space-y-2 pl-4">
            {items.map(item => (
              <Checkbox
                key={item.id}
                label={item.label}
                checked={item.checked}
                onChange={handleItemChange(item.id)}
              />
            ))}
          </div>
          <div class="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
            {items.filter(item => item.checked).length} of {items.length} items selected
          </div>
        </div>
      );
    };

    return <SelectAllComponent />;
  },
};

// All states showcase
export const AllStates = {
  render: () => (
    <div class="space-y-6 max-w-2xl">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Basic States</h3>
        <div class="space-y-2">
          <Checkbox label="Unchecked" checked={false} />
          <Checkbox label="Checked" checked={true} />
          <Checkbox label="Disabled Unchecked" checked={false} disabled />
          <Checkbox label="Disabled Checked" checked={true} disabled />
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Without Labels</h3>
        <div class="flex space-x-4">
          <Checkbox checked={false} />
          <Checkbox checked={true} />
          <Checkbox checked={false} disabled />
          <Checkbox checked={true} disabled />
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Long Labels</h3>
        <div class="space-y-2">
          <Checkbox
            label="I agree to receive marketing communications and promotional offers from the company and its partners"
            checked={false}
          />
          <Checkbox
            label="By checking this box, I acknowledge that I have read and understood the Privacy Policy and Terms of Service"
            checked={true}
          />
        </div>
      </div>
    </div>
  ),
};

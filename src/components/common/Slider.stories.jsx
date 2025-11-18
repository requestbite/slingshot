import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { Slider } from './Slider';
import { Label } from './Label';

export default {
  title: 'Common/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'number',
    },
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'number',
    },
    disabled: { control: 'boolean' },
    onInput: { action: 'onInput' },
    onChange: { action: 'onChange' },
  },
  args: {
    onInput: fn(),
    onChange: fn(),
  },
};

// Basic slider
export const Default = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    step: 1,
  },
};

// Width control (like in ScreenshotMakerPage)
export const WidthControl = {
  render: () => {
    const WidthSlider = () => {
      const [width, setWidth] = useState(1500);

      return (
        <div class="w-64">
          <Label htmlFor="width">Width: {width}px</Label>
          <Slider
            id="width"
            min={500}
            max={2000}
            step={50}
            value={width}
            onInput={(e) => setWidth(Number(e.target.value))}
          />
        </div>
      );
    };

    return <WidthSlider />;
  },
};

// Margin control (like in ScreenshotMakerPage)
export const MarginControl = {
  render: () => {
    const MarginSlider = () => {
      const [margin, setMargin] = useState(80);

      return (
        <div class="w-64">
          <Label htmlFor="margin">Margin: {margin}px</Label>
          <Slider
            id="margin"
            min={0}
            max={200}
            step={10}
            value={margin}
            onInput={(e) => setMargin(Number(e.target.value))}
          />
        </div>
      );
    };

    return <MarginSlider />;
  },
};

// Border radius control (like in ScreenshotMakerPage)
export const BorderRadiusControl = {
  render: () => {
    const RadiusSlider = () => {
      const [borderRadius, setBorderRadius] = useState(20);

      return (
        <div class="w-64">
          <Label htmlFor="borderRadius">Radius: {borderRadius}px</Label>
          <Slider
            id="borderRadius"
            min={0}
            max={50}
            step={1}
            value={borderRadius}
            onInput={(e) => setBorderRadius(Number(e.target.value))}
          />
        </div>
      );
    };

    return <RadiusSlider />;
  },
};

// Shadow blur control (like in ScreenshotMakerPage)
export const ShadowBlurControl = {
  render: () => {
    const ShadowSlider = () => {
      const [shadowBlur, setShadowBlur] = useState(40);

      return (
        <div class="w-64">
          <Label htmlFor="shadowBlur">Shadow Blur: {shadowBlur}px</Label>
          <Slider
            id="shadowBlur"
            min={0}
            max={100}
            step={5}
            value={shadowBlur}
            onInput={(e) => setShadowBlur(Number(e.target.value))}
          />
        </div>
      );
    };

    return <ShadowSlider />;
  },
};

// Shadow offset control with negative values (like in ScreenshotMakerPage)
export const ShadowOffsetControl = {
  render: () => {
    const OffsetSlider = () => {
      const [shadowOffsetY, setShadowOffsetY] = useState(10);

      return (
        <div class="w-64">
          <Label htmlFor="shadowOffsetY">Shadow Y: {shadowOffsetY}px</Label>
          <Slider
            id="shadowOffsetY"
            min={-50}
            max={50}
            step={1}
            value={shadowOffsetY}
            onInput={(e) => setShadowOffsetY(Number(e.target.value))}
          />
        </div>
      );
    };

    return <OffsetSlider />;
  },
};

// Disabled state
export const Disabled = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    step: 1,
    disabled: true,
  },
};

// Small range
export const SmallRange = {
  render: () => {
    const SmallRangeSlider = () => {
      const [value, setValue] = useState(5);

      return (
        <div class="w-64">
          <Label htmlFor="smallRange">Value: {value}</Label>
          <Slider
            id="smallRange"
            min={0}
            max={10}
            step={1}
            value={value}
            onInput={(e) => setValue(Number(e.target.value))}
          />
        </div>
      );
    };

    return <SmallRangeSlider />;
  },
};

// Decimal steps
export const DecimalSteps = {
  render: () => {
    const DecimalSlider = () => {
      const [value, setValue] = useState(2.5);

      return (
        <div class="w-64">
          <Label htmlFor="decimal">Value: {value.toFixed(1)}</Label>
          <Slider
            id="decimal"
            min={0}
            max={5}
            step={0.1}
            value={value}
            onInput={(e) => setValue(Number(e.target.value))}
          />
        </div>
      );
    };

    return <DecimalSlider />;
  },
};

// All settings from ScreenshotMakerPage
export const ScreenshotSettings = {
  render: () => {
    const SettingsPanel = () => {
      const [width, setWidth] = useState(1500);
      const [margin, setMargin] = useState(80);
      const [borderRadius, setBorderRadius] = useState(20);
      const [shadowBlur, setShadowBlur] = useState(40);
      const [shadowOffsetY, setShadowOffsetY] = useState(10);

      return (
        <div class="w-64 bg-white rounded-lg border border-gray-300 p-6">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">Settings</h3>

          <div class="space-y-4">
            {/* Canvas Width */}
            <div>
              <Label htmlFor="width">Width: {width}px</Label>
              <Slider
                id="width"
                min={500}
                max={2000}
                step={50}
                value={width}
                onInput={(e) => setWidth(Number(e.target.value))}
              />
            </div>

            {/* Margin */}
            <div>
              <Label htmlFor="margin">Margin: {margin}px</Label>
              <Slider
                id="margin"
                min={0}
                max={200}
                step={10}
                value={margin}
                onInput={(e) => setMargin(Number(e.target.value))}
              />
            </div>

            {/* Border Radius */}
            <div>
              <Label htmlFor="borderRadius">Radius: {borderRadius}px</Label>
              <Slider
                id="borderRadius"
                min={0}
                max={50}
                step={1}
                value={borderRadius}
                onInput={(e) => setBorderRadius(Number(e.target.value))}
              />
            </div>

            {/* Shadow Blur */}
            <div>
              <Label htmlFor="shadowBlur">Shadow Blur: {shadowBlur}px</Label>
              <Slider
                id="shadowBlur"
                min={0}
                max={100}
                step={5}
                value={shadowBlur}
                onInput={(e) => setShadowBlur(Number(e.target.value))}
              />
            </div>

            {/* Shadow Offset Y */}
            <div>
              <Label htmlFor="shadowOffsetY">Shadow Y: {shadowOffsetY}px</Label>
              <Slider
                id="shadowOffsetY"
                min={-50}
                max={50}
                step={1}
                value={shadowOffsetY}
                onInput={(e) => setShadowOffsetY(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      );
    };

    return <SettingsPanel />;
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const InteractiveSlider = () => {
      const [value, setValue] = useState(50);
      const [min, setMin] = useState(0);
      const [max, setMax] = useState(100);
      const [step, setStep] = useState(1);
      const [disabled, setDisabled] = useState(false);

      return (
        <div class="space-y-6 max-w-2xl">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Controls</h3>
            <div class="flex flex-wrap gap-4 mb-4">
              <label class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={disabled}
                  onChange={(e) => setDisabled(e.target.checked)}
                  class="rounded"
                />
                <span class="text-sm">Disabled</span>
              </label>
            </div>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm w-16">Min:</span>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(Number(e.target.value))}
                  class="rounded border-gray-300 text-sm w-20"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm w-16">Max:</span>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(Number(e.target.value))}
                  class="rounded border-gray-300 text-sm w-20"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm w-16">Step:</span>
                <input
                  type="number"
                  value={step}
                  onChange={(e) => setStep(Number(e.target.value))}
                  class="rounded border-gray-300 text-sm w-20"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Slider</h3>
            <div class="w-64">
              <Label htmlFor="interactive">Value: {value}</Label>
              <Slider
                id="interactive"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onInput={(e) => setValue(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      );
    };

    return <InteractiveSlider />;
  },
};

import { useState } from 'preact/hooks';
import { ScreenshotEditor } from './ScreenshotEditor';
import { TextInput } from './TextInput';
import { Label } from './Label';
import { Select } from './Select';

export default {
  title: 'Common/ScreenshotEditor',
  component: ScreenshotEditor,
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: { type: 'number', min: 500, max: 2000, step: 50 },
      description: 'Canvas width in pixels'
    },
    margin: {
      control: { type: 'number', min: 0, max: 200, step: 10 },
      description: 'Padding around the image in pixels'
    },
    borderRadius: {
      control: { type: 'number', min: 0, max: 50, step: 1 },
      description: 'Border radius of the image in pixels'
    },
    shadowBlur: {
      control: { type: 'number', min: 0, max: 100, step: 5 },
      description: 'Shadow blur-sm radius in pixels'
    },
    shadowOffsetX: {
      control: { type: 'number', min: -50, max: 50, step: 1 },
      description: 'Shadow horizontal offset in pixels'
    },
    shadowOffsetY: {
      control: { type: 'number', min: -50, max: 50, step: 1 },
      description: 'Shadow vertical offset in pixels'
    },
    shadowColor: {
      control: 'color',
      description: 'Shadow color (rgba or hex)'
    },
    gradientStartColor: {
      control: 'color',
      description: 'Gradient start color'
    },
    gradientEndColor: {
      control: 'color',
      description: 'Gradient end color'
    },
    gradientDirection: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Gradient direction'
    }
  }
};

// Default story
export const Default = {
  args: {
    width: 1500,
    margin: 60,
    borderRadius: 8,
    shadowBlur: 40,
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    shadowColor: 'rgba(0,0,0,0.3)',
    gradientStartColor: '#667eea',
    gradientEndColor: '#764ba2',
    gradientDirection: 'horizontal'
  }
};

// Minimal style
export const Minimal = {
  args: {
    width: 1500,
    margin: 40,
    borderRadius: 0,
    shadowBlur: 10,
    shadowOffsetX: 0,
    shadowOffsetY: 5,
    shadowColor: 'rgba(0,0,0,0.15)',
    gradientStartColor: '#f3f4f6',
    gradientEndColor: '#e5e7eb',
    gradientDirection: 'horizontal'
  }
};

// Bold style
export const Bold = {
  args: {
    width: 1500,
    margin: 100,
    borderRadius: 16,
    shadowBlur: 60,
    shadowOffsetX: 0,
    shadowOffsetY: 20,
    shadowColor: 'rgba(0,0,0,0.5)',
    gradientStartColor: '#ff6b6b',
    gradientEndColor: '#feca57',
    gradientDirection: 'horizontal'
  }
};

// Vertical gradient
export const VerticalGradient = {
  args: {
    width: 1500,
    margin: 60,
    borderRadius: 12,
    shadowBlur: 40,
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    shadowColor: 'rgba(0,0,0,0.3)',
    gradientStartColor: '#4facfe',
    gradientEndColor: '#00f2fe',
    gradientDirection: 'vertical'
  }
};

// Ocean theme
export const OceanTheme = {
  args: {
    width: 1500,
    margin: 80,
    borderRadius: 10,
    shadowBlur: 50,
    shadowOffsetX: 0,
    shadowOffsetY: 15,
    shadowColor: 'rgba(0,0,0,0.4)',
    gradientStartColor: '#2193b0',
    gradientEndColor: '#6dd5ed',
    gradientDirection: 'horizontal'
  }
};

// Sunset theme
export const SunsetTheme = {
  args: {
    width: 1500,
    margin: 60,
    borderRadius: 8,
    shadowBlur: 40,
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    shadowColor: 'rgba(0,0,0,0.3)',
    gradientStartColor: '#ee0979',
    gradientEndColor: '#ff6a00',
    gradientDirection: 'horizontal'
  }
};

// Forest theme
export const ForestTheme = {
  args: {
    width: 1500,
    margin: 60,
    borderRadius: 8,
    shadowBlur: 40,
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    shadowColor: 'rgba(0,0,0,0.3)',
    gradientStartColor: '#134e5e',
    gradientEndColor: '#71b280',
    gradientDirection: 'horizontal'
  }
};

// Small canvas
export const SmallCanvas = {
  args: {
    width: 800,
    margin: 40,
    borderRadius: 6,
    shadowBlur: 30,
    shadowOffsetX: 0,
    shadowOffsetY: 8,
    shadowColor: 'rgba(0,0,0,0.25)',
    gradientStartColor: '#667eea',
    gradientEndColor: '#764ba2',
    gradientDirection: 'horizontal'
  }
};

// Interactive example with live controls
export const Interactive = {
  render: () => {
    const InteractiveEditor = () => {
      const [width, setWidth] = useState(1200);
      const [margin, setMargin] = useState(60);
      const [borderRadius, setBorderRadius] = useState(8);
      const [shadowBlur, setShadowBlur] = useState(40);
      const [shadowOffsetX, setShadowOffsetX] = useState(0);
      const [shadowOffsetY, setShadowOffsetY] = useState(10);
      const [shadowColor, setShadowColor] = useState('rgba(0,0,0,0.3)');
      const [gradientStartColor, setGradientStartColor] = useState('#667eea');
      const [gradientEndColor, setGradientEndColor] = useState('#764ba2');
      const [gradientDirection, setGradientDirection] = useState('horizontal');

      return (
        <div class="space-y-6">
          {/* Controls Panel */}
          <div class="bg-white border border-gray-300 rounded-lg p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-4">Settings</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Canvas Width */}
              <div>
                <Label htmlFor="width">Width: {width}px</Label>
                <input
                  id="width"
                  type="range"
                  min="500"
                  max="2000"
                  step="50"
                  value={width}
                  onInput={(e) => setWidth(Number(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Margin */}
              <div>
                <Label htmlFor="margin">Margin: {margin}px</Label>
                <input
                  id="margin"
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={margin}
                  onInput={(e) => setMargin(Number(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Border Radius */}
              <div>
                <Label htmlFor="borderRadius">Border Radius: {borderRadius}px</Label>
                <input
                  id="borderRadius"
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={borderRadius}
                  onInput={(e) => setBorderRadius(Number(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Shadow Blur */}
              <div>
                <Label htmlFor="shadowBlur">Shadow Blur: {shadowBlur}px</Label>
                <input
                  id="shadowBlur"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={shadowBlur}
                  onInput={(e) => setShadowBlur(Number(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Shadow Offset X */}
              <div>
                <Label htmlFor="shadowOffsetX">Shadow Offset X: {shadowOffsetX}px</Label>
                <input
                  id="shadowOffsetX"
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={shadowOffsetX}
                  onInput={(e) => setShadowOffsetX(Number(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Shadow Offset Y */}
              <div>
                <Label htmlFor="shadowOffsetY">Shadow Offset Y: {shadowOffsetY}px</Label>
                <input
                  id="shadowOffsetY"
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={shadowOffsetY}
                  onInput={(e) => setShadowOffsetY(Number(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Gradient Start Color */}
              <div>
                <Label htmlFor="gradientStartColor">Gradient Start</Label>
                <div class="flex items-center space-x-2">
                  <input
                    id="gradientStartColor"
                    type="color"
                    value={gradientStartColor}
                    onInput={(e) => setGradientStartColor(e.target.value)}
                    class="h-10 w-16 rounded-sm cursor-pointer"
                  />
                  <TextInput
                    value={gradientStartColor}
                    onInput={(e) => setGradientStartColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Gradient End Color */}
              <div>
                <Label htmlFor="gradientEndColor">Gradient End</Label>
                <div class="flex items-center space-x-2">
                  <input
                    id="gradientEndColor"
                    type="color"
                    value={gradientEndColor}
                    onInput={(e) => setGradientEndColor(e.target.value)}
                    class="h-10 w-16 rounded-sm cursor-pointer"
                  />
                  <TextInput
                    value={gradientEndColor}
                    onInput={(e) => setGradientEndColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Gradient Direction */}
              <div>
                <Label htmlFor="gradientDirection">Gradient Direction</Label>
                <Select
                  id="gradientDirection"
                  value={gradientDirection}
                  onChange={(e) => setGradientDirection(e.target.value)}
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Editor */}
          <ScreenshotEditor
            width={width}
            margin={margin}
            borderRadius={borderRadius}
            shadowBlur={shadowBlur}
            shadowOffsetX={shadowOffsetX}
            shadowOffsetY={shadowOffsetY}
            shadowColor={shadowColor}
            gradientStartColor={gradientStartColor}
            gradientEndColor={gradientEndColor}
            gradientDirection={gradientDirection}
          />
        </div>
      );
    };

    return <InteractiveEditor />;
  }
};

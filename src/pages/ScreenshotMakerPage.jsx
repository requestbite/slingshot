import { useState } from 'preact/hooks';
import { usePageTitle } from '../hooks/usePageTitle';
import { ScreenshotEditor } from '../components/common/ScreenshotEditor';
import { Label } from '../components/common/Label';
import { TextInput } from '../components/common/TextInput';
import { Select } from '../components/common/Select';
import { Slider } from '../components/common/Slider';

export function ScreenshotMakerPage() {
  usePageTitle('Screenshot Maker');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Editor configuration state
  const [width, setWidth] = useState(1500);
  const [margin, setMargin] = useState(80);
  const [borderRadius, setBorderRadius] = useState(20);
  const [shadowBlur, setShadowBlur] = useState(40);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(10);
  const [shadowColor, setShadowColor] = useState('rgba(0,0,0,0.3)');
  const [gradientStartColor, setGradientStartColor] = useState('#5256cd');
  const [enableMidColor, setEnableMidColor] = useState(true);
  const [gradientMiddleColor, setGradientMiddleColor] = useState('#c1639d');
  const [gradientEndColor, setGradientEndColor] = useState('#f7bb79');
  const [gradientDirection, setGradientDirection] = useState('top-left');

  return (
    <div class="h-full bg-gray-100 overflow-y-auto">
      <div class="min-h-full pt-[83px] pb-6">
        <div class="max-w-6xl mx-auto px-4">

          {/* Sidebar Toggle Button for Mobile - only show when sidebar is hidden */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            class={`fixed top-1/2 -left-1 transform -translate-y-1/2 z-50 bg-sky-100 hover:bg-sky-200 text-sky-700 p-2 rounded-r-lg shadow-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${isSidebarOpen ? 'hidden' : 'block md:hidden'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          </button>

          <div class="flex gap-4">
            {/* Desktop Sidebar */}
            <div class="w-64 flex-shrink-0 hidden md:block">
              <div class="bg-white rounded-lg border border-gray-300">
                <div class="flex grow flex-col gap-y-5 overflow-y-auto px-6 py-4">
                  <nav class="flex flex-1 flex-col">
                    <h3 class="text-xs text-gray-500 mb-4">Settings</h3>

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

                      {/* Gradient Start Color */}
                      <div>
                        <Label htmlFor="gradientStart">Gradient Start</Label>
                        <input
                          id="gradientStart"
                          type="color"
                          value={gradientStartColor}
                          onInput={(e) => setGradientStartColor(e.target.value)}
                          class="w-full h-10 rounded cursor-pointer"
                        />
                      </div>

                      {/* Enable Mid-Color Checkbox */}
                      <div>
                        <label class="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableMidColor}
                            onChange={(e) => setEnableMidColor(e.target.checked)}
                            class="rounded cursor-pointer"
                          />
                          <span class="text-sm font-medium text-gray-700">Enable Mid-Color</span>
                        </label>
                      </div>

                      {/* Gradient Middle Color */}
                      {enableMidColor && (
                        <div>
                          <Label htmlFor="gradientMiddle">Gradient Middle</Label>
                          <input
                            id="gradientMiddle"
                            type="color"
                            value={gradientMiddleColor}
                            onInput={(e) => setGradientMiddleColor(e.target.value)}
                            class="w-full h-10 rounded cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Gradient End Color */}
                      <div>
                        <Label htmlFor="gradientEnd">Gradient End</Label>
                        <input
                          id="gradientEnd"
                          type="color"
                          value={gradientEndColor}
                          onInput={(e) => setGradientEndColor(e.target.value)}
                          class="w-full h-10 rounded cursor-pointer"
                        />
                      </div>

                      {/* Gradient Direction */}
                      <div>
                        <Label htmlFor="gradientDirection">Direction</Label>
                        <Select
                          id="gradientDirection"
                          value={gradientDirection}
                          onChange={(value) => setGradientDirection(value)}
                          options={[
                            { value: 'top', label: 'From top' },
                            { value: 'bottom', label: 'From bottom' },
                            { value: 'left', label: 'From left' },
                            { value: 'right', label: 'From right' },
                            { value: 'top-left', label: 'From top left' },
                            { value: 'top-right', label: 'From top right' },
                            { value: 'bottom-left', label: 'From bottom left' },
                            { value: 'bottom-right', label: 'From bottom right' }
                          ]}
                          placeholder=""
                        />
                      </div>
                    </div>
                  </nav>
                </div>
              </div>
            </div>

            {/* Mobile Sidebar */}
            {isSidebarOpen && (
              <>
                {/* Full screen overlay covering topbar */}
                <div
                  class="fixed inset-0 bg-gray-500/75 z-[60] md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />

                {/* Mobile Sidebar - takes full screen minus 75px, covers topbar */}
                <div class="fixed left-0 top-0 bottom-0 right-[75px] bg-white z-[70] md:hidden overflow-y-auto">
                  <div class="p-6">
                    <nav class="flex flex-1 flex-col">
                      <h3 class="text-sm font-semibold text-gray-900 mb-4">Settings</h3>

                      <div class="space-y-4">
                        {/* Canvas Width */}
                        <div>
                          <Label htmlFor="width-mobile">Width: {width}px</Label>
                          <Slider
                            id="width-mobile"
                            min={500}
                            max={2000}
                            step={50}
                            value={width}
                            onInput={(e) => setWidth(Number(e.target.value))}
                          />
                        </div>

                        {/* Margin */}
                        <div>
                          <Label htmlFor="margin-mobile">Margin: {margin}px</Label>
                          <Slider
                            id="margin-mobile"
                            min={0}
                            max={200}
                            step={10}
                            value={margin}
                            onInput={(e) => setMargin(Number(e.target.value))}
                          />
                        </div>

                        {/* Border Radius */}
                        <div>
                          <Label htmlFor="borderRadius-mobile">Radius: {borderRadius}px</Label>
                          <Slider
                            id="borderRadius-mobile"
                            min={0}
                            max={50}
                            step={1}
                            value={borderRadius}
                            onInput={(e) => setBorderRadius(Number(e.target.value))}
                          />
                        </div>

                        {/* Shadow Blur */}
                        <div>
                          <Label htmlFor="shadowBlur-mobile">Shadow Blur: {shadowBlur}px</Label>
                          <Slider
                            id="shadowBlur-mobile"
                            min={0}
                            max={100}
                            step={5}
                            value={shadowBlur}
                            onInput={(e) => setShadowBlur(Number(e.target.value))}
                          />
                        </div>

                        {/* Shadow Offset Y */}
                        <div>
                          <Label htmlFor="shadowOffsetY-mobile">Shadow Y: {shadowOffsetY}px</Label>
                          <Slider
                            id="shadowOffsetY-mobile"
                            min={-50}
                            max={50}
                            step={1}
                            value={shadowOffsetY}
                            onInput={(e) => setShadowOffsetY(Number(e.target.value))}
                          />
                        </div>

                        {/* Gradient Start Color */}
                        <div>
                          <Label htmlFor="gradientStart-mobile">Gradient Start</Label>
                          <input
                            id="gradientStart-mobile"
                            type="color"
                            value={gradientStartColor}
                            onInput={(e) => setGradientStartColor(e.target.value)}
                            class="w-full h-10 rounded cursor-pointer"
                          />
                        </div>

                        {/* Enable Mid-Color Checkbox */}
                        <div>
                          <label class="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={enableMidColor}
                              onChange={(e) => setEnableMidColor(e.target.checked)}
                              class="rounded cursor-pointer"
                            />
                            <span class="text-sm font-medium text-gray-700">Enable Mid-Color</span>
                          </label>
                        </div>

                        {/* Gradient Middle Color */}
                        {enableMidColor && (
                          <div>
                            <Label htmlFor="gradientMiddle-mobile">Gradient Middle</Label>
                            <input
                              id="gradientMiddle-mobile"
                              type="color"
                              value={gradientMiddleColor}
                              onInput={(e) => setGradientMiddleColor(e.target.value)}
                              class="w-full h-10 rounded cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Gradient End Color */}
                        <div>
                          <Label htmlFor="gradientEnd-mobile">Gradient End</Label>
                          <input
                            id="gradientEnd-mobile"
                            type="color"
                            value={gradientEndColor}
                            onInput={(e) => setGradientEndColor(e.target.value)}
                            class="w-full h-10 rounded cursor-pointer"
                          />
                        </div>

                        {/* Gradient Direction */}
                        <div>
                          <Label htmlFor="gradientDirection-mobile">Direction</Label>
                          <Select
                            id="gradientDirection-mobile"
                            value={gradientDirection}
                            onChange={(value) => setGradientDirection(value)}
                            options={[
                              { value: 'top', label: 'From top' },
                              { value: 'bottom', label: 'From bottom' },
                              { value: 'left', label: 'From left' },
                              { value: 'right', label: 'From right' },
                              { value: 'top-left', label: 'From top left' },
                              { value: 'top-right', label: 'From top right' },
                              { value: 'bottom-left', label: 'From bottom left' },
                              { value: 'bottom-right', label: 'From bottom right' }
                            ]}
                            placeholder=""
                          />
                        </div>
                      </div>
                    </nav>
                  </div>
                </div>
              </>
            )}

            {/* Content Area */}
            <div class="flex-1 min-w-0 overflow-hidden">
              <div class="bg-white rounded-lg border border-gray-300 p-6 w-full max-w-full overflow-hidden">
                <h2 class="text-base font-semibold text-gray-900">Screenshot Editor</h2>
                <p class="mt-1 text-sm text-gray-600 mb-6">
                  Style your screenshots like we do! Nothing is sent to any server - your browser does the job!
                </p>
                <div>
                  <ScreenshotEditor
                    width={width}
                    margin={margin}
                    borderRadius={borderRadius}
                    shadowBlur={shadowBlur}
                    shadowOffsetX={shadowOffsetX}
                    shadowOffsetY={shadowOffsetY}
                    shadowColor={shadowColor}
                    gradientStartColor={gradientStartColor}
                    gradientMiddleColor={enableMidColor ? gradientMiddleColor : null}
                    gradientEndColor={gradientEndColor}
                    gradientDirection={gradientDirection}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

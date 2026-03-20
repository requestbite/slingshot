import { Donut } from './Donut';

export default {
  title: 'Common/Donut',
  component: Donut,
  tags: ['autodocs'],
  argTypes: {
    size: { control: { type: 'range', min: 60, max: 300, step: 10 } },
    thickness: { control: { type: 'range', min: 5, max: 60, step: 5 } },
    emptyColor: { control: 'color' },
  },
};

export const Default = {
  args: {
    slices: [
      { value: 3, color: '#0ea5e9' },
      { value: 5, color: '#22c55e' },
      { value: 2, color: '#f59e0b' },
    ],
    max: 10,
  },
};

export const Partial = {
  args: {
    slices: [
      { value: 3, color: '#0ea5e9' },
      { value: 2, color: '#f43f5e' },
    ],
    max: 10,
  },
};

export const Full = {
  args: {
    slices: [
      { value: 4, color: '#6366f1' },
      { value: 3, color: '#f59e0b' },
      { value: 3, color: '#22c55e' },
    ],
    max: 10,
  },
};

export const SingleSlice = {
  args: {
    slices: [{ value: 7, color: '#0ea5e9' }],
    max: 10,
  },
};

export const EmptyDonut = {
  args: {
    slices: [],
    max: 10,
  },
};

export const Large = {
  args: {
    slices: [
      { value: 3, color: '#0ea5e9' },
      { value: 5, color: '#22c55e' },
      { value: 2, color: '#f59e0b' },
    ],
    max: 10,
    size: 220,
    thickness: 40,
  },
};

export const Small = {
  args: {
    slices: [
      { value: 3, color: '#0ea5e9' },
      { value: 5, color: '#22c55e' },
      { value: 2, color: '#f59e0b' },
    ],
    max: 10,
    size: 60,
    thickness: 10,
  },
};

export const ManySlices = {
  render: () => (
    <Donut
      slices={[
        { value: 1, color: '#ef4444' },
        { value: 1, color: '#f97316' },
        { value: 1, color: '#eab308' },
        { value: 1, color: '#22c55e' },
        { value: 1, color: '#06b6d4' },
        { value: 1, color: '#6366f1' },
        { value: 1, color: '#a855f7' },
        { value: 1, color: '#ec4899' },
      ]}
      max={8}
    />
  ),
};

export const InContext = {
  render: () => (
    <div class="flex items-center gap-6 p-4 border border-gray-200 rounded-lg w-fit">
      <Donut
        slices={[
          { value: 45, color: '#22c55e' },
          { value: 30, color: '#0ea5e9' },
          { value: 15, color: '#f59e0b' },
        ]}
        max={100}
        size={100}
        thickness={18}
      />
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full" style="background:#22c55e" />
          <span>Success — 45%</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full" style="background:#0ea5e9" />
          <span>Pending — 30%</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full" style="background:#f59e0b" />
          <span>Warning — 15%</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full" style="background:#e5e7eb" />
          <span>Empty — 10%</span>
        </div>
      </div>
    </div>
  ),
};

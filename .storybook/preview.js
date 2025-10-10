import '../src/style.css';

/** @type { import('@storybook/preact-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'gray',
          value: '#f3f4f6',
        },
        {
          name: 'dark',
          value: '#1f2937',
        },
      ],
    },
  },
};

export default preview;
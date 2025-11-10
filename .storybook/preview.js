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
      options: {
        light: {
          name: 'light',
          value: '#ffffff',
        },

        gray: {
          name: 'gray',
          value: '#f3f4f6',
        },

        dark: {
          name: 'dark',
          value: '#1f2937',
        }
      }
    },
  },

  initialGlobals: {
    backgrounds: {
      value: 'light'
    }
  }
};

export default preview;
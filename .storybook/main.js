/** @type { import('@storybook/preact-vite').StorybookConfig } */
const config = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-a11y"
  ],
  "framework": {
    "name": "@storybook/preact-vite",
    "options": {}
  },
  async viteFinal(config) {
    // Configure esbuild to handle JSX in .js files
    config.esbuild = {
      ...config.esbuild,
      jsxInject: `import { h } from 'preact'`,
    };

    // Configure optimizeDeps to handle .js files with JSX
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.esbuildOptions = config.optimizeDeps.esbuildOptions || {};
    config.optimizeDeps.esbuildOptions.loader = {
      ...config.optimizeDeps.esbuildOptions.loader,
      '.js': 'jsx',
    };

    // Ensure Preact dependencies are properly deduplicated
    config.resolve = config.resolve || {};
    config.resolve.dedupe = config.resolve.dedupe || [];
    config.resolve.dedupe.push('preact', 'preact/hooks', 'preact/compat');

    return config;
  }
};
export default config;

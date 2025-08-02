import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		preact(),
		{
			name: 'html-transform',
			transformIndexHtml: {
				order: 'pre',
				handler(html, ctx) {
					return html.replace(/%(\w+)%/g, (match, name) => {
						const value = process.env[name];
						return value !== undefined ? value : match;
					});
				}
			}
		}
	],
});

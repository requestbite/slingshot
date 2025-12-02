import { render } from 'preact';
import { App } from './App';
import './style.css';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

// Initialize flag emoji polyfill for browsers that don't support flag emojis
// (primarily Chrome-based browsers on Windows)
polyfillCountryFlagEmojis();

render(<App />, document.getElementById('app'));

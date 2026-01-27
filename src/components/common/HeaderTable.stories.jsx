import { HeaderTable } from './HeaderTable';

export default {
  title: 'Common/HeaderTable',
  component: HeaderTable,
  argTypes: {
    headers: {
      control: 'object',
      description: 'Array of header objects with name and value (each can be string or { text, url })',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the container',
    },
  },
};

// Basic headers with plain text
export const Default = {
  args: {
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Content-Length', value: '1234' },
      { name: 'Cache-Control', value: 'no-cache' },
    ],
  },
};

// Headers with clickable name links
export const WithNameLinks = {
  args: {
    headers: [
      {
        name: { text: 'Content-Type', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type' },
        value: 'application/json',
      },
      {
        name: { text: 'Cache-Control', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control' },
        value: 'max-age=3600',
      },
      {
        name: 'X-Custom-Header',
        value: 'custom-value',
      },
    ],
  },
};

// Headers with clickable value links
export const WithValueLinks = {
  args: {
    headers: [
      {
        name: 'Location',
        value: { text: 'https://example.com/redirect', url: 'https://example.com/redirect' },
      },
      {
        name: 'Link',
        value: { text: '</api/next>; rel="next"', url: '/api/next' },
      },
      {
        name: 'Content-Type',
        value: 'text/html',
      },
    ],
  },
};

// Headers with both name and value links
export const WithBothLinks = {
  args: {
    headers: [
      {
        name: { text: 'Authorization', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization' },
        value: { text: 'Bearer token...', url: 'https://jwt.io' },
      },
      {
        name: { text: 'Content-Type', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type' },
        value: 'application/json',
      },
    ],
  },
};

// HTTP Response headers example
export const HttpResponseHeaders = {
  args: {
    headers: [
      { name: 'Date', value: 'Mon, 27 Jan 2025 12:00:00 GMT' },
      { name: 'Server', value: 'nginx/1.18.0' },
      {
        name: { text: 'Content-Type', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type' },
        value: 'application/json; charset=utf-8',
      },
      { name: 'Content-Length', value: '2048' },
      {
        name: { text: 'Cache-Control', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control' },
        value: 'public, max-age=3600',
      },
      { name: 'ETag', value: '"abc123def456"' },
      { name: 'X-Request-Id', value: 'req_abc123xyz789' },
      { name: 'X-RateLimit-Remaining', value: '99' },
    ],
  },
};

// Empty headers (renders nothing)
export const Empty = {
  args: {
    headers: [],
  },
};

// Single header
export const SingleHeader = {
  args: {
    headers: [
      { name: 'Content-Type', value: 'text/plain' },
    ],
  },
};

// Long values that truncate
export const LongValues = {
  args: {
    headers: [
      {
        name: 'Set-Cookie',
        value: 'session=abc123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400',
      },
      {
        name: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      },
      {
        name: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Custom-Header',
      },
    ],
  },
};

// With custom className
export const WithCustomClass = {
  args: {
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Accept', value: '*/*' },
    ],
    className: 'bg-gray-50 p-2 rounded',
  },
};

// Showcase of all variations
export const Showcase = {
  render: () => (
    <div class="space-y-8">
      <div>
        <h3 class="text-lg font-semibold mb-2">Plain Text Headers</h3>
        <HeaderTable
          headers={[
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Content-Length', value: '1024' },
          ]}
        />
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-2">With Clickable Name</h3>
        <HeaderTable
          headers={[
            {
              name: { text: 'Content-Type', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type' },
              value: 'application/json',
            },
          ]}
        />
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-2">With Clickable Value</h3>
        <HeaderTable
          headers={[
            {
              name: 'Location',
              value: { text: 'https://example.com/new-page', url: 'https://example.com/new-page' },
            },
          ]}
        />
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-2">Mixed Links</h3>
        <HeaderTable
          headers={[
            {
              name: { text: 'Authorization', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization' },
              value: { text: 'View JWT', url: 'https://jwt.io' },
            },
            { name: 'X-Request-Id', value: 'req_123abc' },
          ]}
        />
      </div>
    </div>
  ),
};

import { HtmlPreview } from './HtmlPreview';

export default {
  title: 'Request/HtmlPreview',
  component: HtmlPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

const simpleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Simple HTML</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    h1 { margin: 0 0 10px 0; }
    p { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>This is a simple HTML response.</p>
  <p>Current time: ${new Date().toLocaleTimeString()}</p>
</body>
</html>
`;

const styledHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Styled HTML</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f7fafc;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #2d3748;
      margin: 0 0 16px 0;
      font-size: 24px;
    }
    p {
      color: #4a5568;
      line-height: 1.6;
      margin: 0 0 12px 0;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background: #4299e1;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to the API</h1>
    <p>Your request was successful!</p>
    <p>This is a styled HTML response from the server.</p>
    <a href="#" class="button">Learn More</a>
  </div>
</body>
</html>
`;

const tableHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Data Table</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #4a5568;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f7fafc;
    }
  </style>
</head>
<body>
  <h2 style="color: #2d3748; margin-top: 0;">User Data</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>John Doe</td>
        <td>john@example.com</td>
        <td>Active</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Jane Smith</td>
        <td>jane@example.com</td>
        <td>Active</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Bob Johnson</td>
        <td>bob@example.com</td>
        <td>Inactive</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

// Simple HTML
export const SimpleHTML = {
  args: {
    response: {
      responseData: simpleHtml,
    },
  },
};

// Styled HTML
export const StyledHTML = {
  args: {
    response: {
      responseData: styledHtml,
    },
  },
};

// Table HTML
export const TableHTML = {
  args: {
    response: {
      responseData: tableHtml,
    },
  },
};

// Empty response
export const EmptyResponse = {
  args: {
    response: {
      responseData: null,
    },
  },
};

// Minimal HTML
export const MinimalHTML = {
  args: {
    response: {
      responseData: '<h1>Hello!</h1><p>Minimal HTML content</p>',
    },
  },
};

// In container
export const InContainer = {
  render: () => (
    <div class="p-4" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      <h3 class="text-lg font-semibold mb-4">HTML Response Preview</h3>
      <div style={{ flex: 1, display: 'flex' }}>
        <HtmlPreview response={{ responseData: styledHtml }} />
      </div>
    </div>
  ),
};

// Multiple previews
export const MultiplePreviews = {
  render: () => (
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-4">Different HTML Responses</h3>
      <div class="grid grid-cols-2 gap-4" style={{ height: '600px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 class="text-sm font-medium mb-2">Simple</h4>
          <div style={{ flex: 1 }}>
            <HtmlPreview response={{ responseData: simpleHtml }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 class="text-sm font-medium mb-2">Styled Card</h4>
          <div style={{ flex: 1 }}>
            <HtmlPreview response={{ responseData: styledHtml }} />
          </div>
        </div>
      </div>
    </div>
  ),
};

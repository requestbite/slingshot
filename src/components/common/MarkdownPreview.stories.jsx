import { MarkdownPreview } from './MarkdownPreview';

export default {
  title: 'Common/MarkdownPreview',
  component: MarkdownPreview,
  tags: ['autodocs'],
  argTypes: {
    content: { control: 'text' },
  },
};

// Basic markdown
export const Basic = {
  args: {
    content: `# Hello World

This is a **basic** markdown preview with _italic_ and **bold** text.`,
  },
};

// Headers
export const Headers = {
  args: {
    content: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

Regular paragraph text follows the headings.`,
  },
};

// Lists
export const Lists = {
  args: {
    content: `## Unordered List

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

## Ordered List

1. First item
2. Second item
3. Third item
   1. Nested 3.1
   2. Nested 3.2
4. Fourth item`,
  },
};

// Links and emphasis
export const LinksAndEmphasis = {
  args: {
    content: `# Text Formatting

This paragraph has **bold text**, *italic text*, and ***bold italic text***.

You can also use __underscores__ for _emphasis_.

Here's a [link to Google](https://www.google.com) and here's another [link](https://example.com).

Inline \`code\` looks like this.`,
  },
};

// Code blocks
export const CodeBlocks = {
  args: {
    content: `# Code Examples

Inline code: \`const x = 42;\`

Code block:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

Another example:

\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "active": true
}
\`\`\``,
  },
};

// Blockquotes
export const Blockquotes = {
  args: {
    content: `# Blockquotes

> This is a blockquote.
> It can span multiple lines.

> This is another blockquote with **formatting**.

Regular text after the blockquote.`,
  },
};

// API Documentation Example
export const APIDocumentation = {
  args: {
    content: `# User API

## Get User by ID

Retrieves a single user by their unique identifier.

### Endpoint

\`GET /api/v1/users/:id\`

### Path Parameters

- \`id\` (required): The unique identifier of the user

### Response

\`\`\`json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2025-01-01T00:00:00Z"
}
\`\`\`

### Error Responses

- \`404 Not Found\`: User does not exist
- \`401 Unauthorized\`: Missing or invalid authentication

### Example Request

\`\`\`bash
curl -X GET https://api.example.com/api/v1/users/123 \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\``,
  },
};

// Collection description
export const CollectionDescription = {
  args: {
    content: `# E-Commerce API Collection

This collection contains all endpoints for the **E-Commerce Platform** API.

## Authentication

All endpoints require authentication using a Bearer token:

\`Authorization: Bearer YOUR_API_TOKEN\`

## Base URL

\`https://api.ecommerce-example.com/v1\`

## Available Endpoints

### Products
- List all products
- Get product details
- Create new product
- Update product
- Delete product

### Orders
- List all orders
- Get order details
- Create new order
- Update order status

### Customers
- List all customers
- Get customer details
- Update customer information

## Rate Limiting

This API is rate limited to **100 requests per minute** per API key.

## Support

For issues or questions, contact support@example.com`,
  },
};

// Empty content
export const Empty = {
  args: {
    content: '',
  },
};

// Rich formatting
export const RichFormatting = {
  args: {
    content: `# Complete Markdown Example

## Text Formatting

You can make text **bold**, *italic*, or ***both***.

## Lists

### Unordered
- Apple
- Banana
- Orange

### Ordered
1. First
2. Second
3. Third

## Links and Code

Visit [our website](https://example.com) for more info.

Run this command: \`npm install\`

## Code Block

\`\`\`javascript
const API_KEY = process.env.API_KEY;
fetch('https://api.example.com/data', {
  headers: { 'Authorization': \`Bearer \${API_KEY}\` }
});
\`\`\`

## Blockquote

> "The best way to predict the future is to invent it."
> — Alan Kay

## Horizontal Rule

---

That's all folks!`,
  },
};

// Long document
export const LongDocument = {
  args: {
    content: `# Long Documentation

## Introduction

This is a long markdown document to demonstrate scrolling and typography.

## Chapter 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Section 1.1

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Section 1.2

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## Chapter 2

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Section 2.1

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Section 2.2

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

## Chapter 3

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## Conclusion

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

---

**The End**`,
  },
};

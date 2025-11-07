import { BreadCrumbs } from './BreadCrumbs';

export default {
  title: 'Common/BreadCrumbs',
  component: BreadCrumbs,
  tags: ['autodocs'],
  argTypes: {
    items: { control: 'object' },
  },
};

// Simple breadcrumb: Home > Page
export const Simple = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'Current Page' }
    ],
  },
};

// Two levels: Home > Category > Item
export const TwoLevels = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'Collections', href: '/collections' },
      { name: 'My Collection' }
    ],
  },
};

// Three levels: Home > Category > Subcategory > Item
export const ThreeLevels = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'API Catalog', href: '/catalog' },
      { name: 'Categories', href: '/catalog/categories' },
      { name: 'Payment APIs' }
    ],
  },
};

// Deep nesting
export const DeepNesting = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'Collections', href: '/collections' },
      { name: 'REST APIs', href: '/collections/rest' },
      { name: 'Payment', href: '/collections/rest/payment' },
      { name: 'Stripe API' }
    ],
  },
};

// API Catalog example
export const APICatalog = {
  args: {
    items: [
      { name: 'Home', href: '/catalog' },
      { name: 'Category' },
      { name: 'Stripe API' }
    ],
  },
};

// Collection details example
export const CollectionDetails = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'Collections', href: '/collections' },
      { name: 'Production APIs' }
    ],
  },
};

// Request details example
export const RequestDetails = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'Collections', href: '/collections' },
      { name: 'Production APIs', href: '/collections/123' },
      { name: 'GET /users' }
    ],
  },
};

// Settings page example
export const Settings = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'Settings' }
    ],
  },
};

// Only home (edge case)
export const OnlyHome = {
  args: {
    items: [
      { name: 'Home', href: '/' }
    ],
  },
};

// Home not clickable (current page is home)
export const HomeAsCurrentPage = {
  args: {
    items: [
      { name: 'Home' }
    ],
  },
};

// Long item names
export const LongNames = {
  args: {
    items: [
      { name: 'Home', href: '/' },
      { name: 'API Catalog', href: '/catalog' },
      { name: 'Payment and Financial Services' },
      { name: 'Stripe Payment Processing API v2023.1' }
    ],
  },
};

// Real-world example in a page context
export const InPageContext = {
  render: () => (
    <div class="bg-gray-100 min-h-screen p-8">
      <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg border border-gray-300 p-6">
          <BreadCrumbs
            items={[
              { name: 'Home', href: '/' },
              { name: 'API Catalog', href: '/catalog' },
              { name: 'Category' },
              { name: 'Stripe Payment API' }
            ]}
            className="mb-4"
          />
          <h1 class="text-2xl font-semibold text-gray-900">
            Stripe Payment API
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            Accept payments, send payouts, and manage your business online.
          </p>
        </div>
      </div>
    </div>
  ),
};

// Multiple breadcrumbs showing different states
export const AllVariants = {
  render: () => (
    <div class="space-y-6 p-6 bg-gray-50">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Simple (2 levels)</h3>
        <div class="bg-white p-4 rounded border border-gray-200">
          <BreadCrumbs
            items={[
              { name: 'Home', href: '/' },
              { name: 'Collections' }
            ]}
          />
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Medium (3 levels)</h3>
        <div class="bg-white p-4 rounded border border-gray-200">
          <BreadCrumbs
            items={[
              { name: 'Home', href: '/' },
              { name: 'Collections', href: '/collections' },
              { name: 'Production APIs' }
            ]}
          />
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Deep (4 levels)</h3>
        <div class="bg-white p-4 rounded border border-gray-200">
          <BreadCrumbs
            items={[
              { name: 'Home', href: '/' },
              { name: 'Collections', href: '/collections' },
              { name: 'Production APIs', href: '/collections/123' },
              { name: 'GET /users/profile' }
            ]}
          />
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Very Deep (5 levels)</h3>
        <div class="bg-white p-4 rounded border border-gray-200">
          <BreadCrumbs
            items={[
              { name: 'Home', href: '/' },
              { name: 'Collections', href: '/collections' },
              { name: 'REST APIs', href: '/collections/rest' },
              { name: 'Payment', href: '/collections/rest/payment' },
              { name: 'Stripe API v2023' }
            ]}
          />
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">API Catalog Example</h3>
        <div class="bg-white p-4 rounded border border-gray-200">
          <BreadCrumbs
            items={[
              { name: 'Home', href: '/catalog' },
              { name: 'Category' },
              { name: 'Stripe API' }
            ]}
          />
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Home Only</h3>
        <div class="bg-white p-4 rounded border border-gray-200">
          <BreadCrumbs
            items={[
              { name: 'Home', href: '/' }
            ]}
          />
        </div>
      </div>
    </div>
  ),
};

import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { Modal } from './Modal';

export default {
  title: 'Common/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    onClose: { action: 'onClose' },
  },
  args: {
    onClose: fn(),
  },
};

// Small modal
export const Small = {
  args: {
    isOpen: true,
    title: 'Small Modal',
    size: 'sm',
    children: (
      <div>
        <p class="text-sm text-gray-600">
          This is a small modal with minimal content.
        </p>
      </div>
    ),
  },
};

// Medium modal (default)
export const Medium = {
  args: {
    isOpen: true,
    title: 'Medium Modal',
    size: 'md',
    children: (
      <div>
        <p class="text-sm text-gray-600 mb-4">
          This is a medium-sized modal, which is the default size.
        </p>
        <p class="text-sm text-gray-600">
          It can contain more content and is suitable for most use cases.
        </p>
      </div>
    ),
  },
};

// Large modal
export const Large = {
  args: {
    isOpen: true,
    title: 'Large Modal',
    size: 'lg',
    children: (
      <div>
        <p class="text-sm text-gray-600 mb-4">
          This is a large modal that can accommodate more extensive content.
        </p>
        <div class="bg-gray-50 p-4 rounded-md mb-4">
          <h4 class="font-semibold text-sm mb-2">Example Content Block</h4>
          <p class="text-xs text-gray-600">
            Large modals are perfect for forms, detailed information, or multi-step processes.
          </p>
        </div>
        <p class="text-sm text-gray-600">
          The modal automatically handles scrolling when content exceeds the viewport height.
        </p>
      </div>
    ),
  },
};

// Extra large modal
export const ExtraLarge = {
  args: {
    isOpen: true,
    title: 'Extra Large Modal',
    size: 'xl',
    children: (
      <div>
        <p class="text-sm text-gray-600 mb-4">
          This is an extra large modal for complex interfaces.
        </p>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-md">
            <h4 class="font-semibold text-sm mb-2">Section 1</h4>
            <p class="text-xs text-gray-600">Content here...</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-md">
            <h4 class="font-semibold text-sm mb-2">Section 2</h4>
            <p class="text-xs text-gray-600">Content here...</p>
          </div>
        </div>
      </div>
    ),
  },
};

// With form
export const WithForm = {
  args: {
    isOpen: true,
    title: 'Create New Item',
    size: 'md',
    children: (
      <form>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              class="block w-full rounded-md px-3 py-2 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 focus:-outline-offset-2 focus:outline-sky-500 text-sm"
              placeholder="Enter name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows="3"
              class="block w-full rounded-md px-3 py-2 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 focus:-outline-offset-2 focus:outline-sky-500 text-sm"
              placeholder="Enter description"
            />
          </div>
        </div>

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 sm:ml-3 sm:w-auto cursor-pointer"
          >
            Create
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    ),
  },
};

// Closed state
export const Closed = {
  args: {
    isOpen: false,
    title: 'This Modal is Closed',
    size: 'md',
    children: (
      <div>
        <p class="text-sm text-gray-600">
          You should not see this content.
        </p>
      </div>
    ),
  },
};

// Interactive example with useState
export const Interactive = {
  render: () => {
    const InteractiveExample = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div>
          <button
            onClick={() => setIsOpen(true)}
            class="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 cursor-pointer"
          >
            Open Modal
          </button>

          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Interactive Modal"
            size="md"
          >
            <div>
              <p class="text-sm text-gray-600 mb-4">
                This modal can be opened and closed interactively.
              </p>
              <p class="text-sm text-gray-600 mb-4">
                Try pressing <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Escape</kbd> to close it,
                or click the X button.
              </p>
              <button
                onClick={() => setIsOpen(false)}
                class="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </Modal>
        </div>
      );
    };

    return <InteractiveExample />;
  },
};

// With long scrolling content
export const LongContent = {
  args: {
    isOpen: true,
    title: 'Modal with Long Content',
    size: 'md',
    children: (
      <div>
        <p class="text-sm text-gray-600 mb-4">
          This modal demonstrates how scrolling works with long content.
        </p>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} class="mb-3 p-3 bg-gray-50 rounded">
            <h4 class="font-semibold text-sm">Section {i + 1}</h4>
            <p class="text-xs text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.
            </p>
          </div>
        ))}
      </div>
    ),
  },
};

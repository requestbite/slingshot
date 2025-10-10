import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { RenameRequestModal } from './RenameRequestModal';
import { mockContextDecorator } from '../../stories/mocks/mockContext';
import { mockRequest, mockRequests } from '../../stories/mocks/mockData';

export default {
  title: 'Modals/RenameRequestModal',
  component: RenameRequestModal,
  tags: ['autodocs'],
  decorators: [mockContextDecorator],
  argTypes: {
    isOpen: { control: 'boolean' },
    onClose: { action: 'onClose' },
    onUpdate: { action: 'onUpdate' },
  },
  args: {
    onClose: fn(),
    onUpdate: fn(),
  },
};

// Open modal
export const Open = {
  args: {
    isOpen: true,
    request: mockRequest,
  },
};

// Closed modal
export const Closed = {
  args: {
    isOpen: false,
    request: mockRequest,
  },
};

// Different request types
export const GetRequest = {
  args: {
    isOpen: true,
    request: mockRequests[0],
  },
};

export const PostRequest = {
  args: {
    isOpen: true,
    request: mockRequests[1],
  },
};

export const DeleteRequest = {
  args: {
    isOpen: true,
    request: mockRequests[3],
  },
};

// Long request name
export const LongRequestName = {
  args: {
    isOpen: true,
    request: {
      ...mockRequest,
      name: 'Get All Users With Pagination And Filtering By Status And Creation Date',
    },
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [requests, setRequests] = useState([
        { id: 'r1', name: 'Get Users', method: 'GET', collection_id: 'col-1' },
        { id: 'r2', name: 'Create User', method: 'POST', collection_id: 'col-1' },
        { id: 'r3', name: 'Update User', method: 'PUT', collection_id: 'col-1' },
      ]);
      const [selectedRequest, setSelectedRequest] = useState(null);

      return (
        <div class="p-4">
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2">Requests:</h3>
            <div class="space-y-2">
              {requests.map((req) => (
                <div key={req.id} class="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div class="flex items-center gap-2">
                    <span class="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                      {req.method}
                    </span>
                    <p class="text-sm font-medium">{req.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setIsOpen(true);
                    }}
                    class="px-3 py-1 text-sm bg-sky-500 text-white rounded hover:bg-sky-400 cursor-pointer"
                  >
                    Rename
                  </button>
                </div>
              ))}
            </div>
          </div>

          <RenameRequestModal
            isOpen={isOpen}
            request={selectedRequest}
            onClose={() => {
              setIsOpen(false);
              setSelectedRequest(null);
            }}
            onUpdate={(updatedRequest) => {
              setRequests(
                requests.map((r) =>
                  r.id === updatedRequest.id ? { ...r, name: updatedRequest.name } : r
                )
              );
              setIsOpen(false);
              setSelectedRequest(null);
            }}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// With folder selection
export const WithFolderSelection = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(true);
      const request = {
        ...mockRequest,
        folder_id: 'folder-1',
      };

      return (
        <div class="p-4">
          <p class="text-sm text-gray-600 mb-4">
            This request is currently in a folder. You can rename it and/or move it to a different folder.
          </p>
          <RenameRequestModal
            isOpen={isOpen}
            request={request}
            onClose={() => setIsOpen(false)}
            onUpdate={fn()}
          />
        </div>
      );
    };

    return <Example />;
  },
};

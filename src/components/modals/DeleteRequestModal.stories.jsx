import { fn } from 'storybook/test';
import { useState } from 'preact/hooks';
import { DeleteRequestModal } from './DeleteRequestModal';
import { mockRequest, mockRequests } from '../../stories/mocks/mockData';

export default {
  title: 'Modals/DeleteRequestModal',
  component: DeleteRequestModal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    onClose: { action: 'onClose' },
    onDelete: { action: 'onDelete' },
  },
  args: {
    onClose: fn(),
    onDelete: fn(),
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

// Different request methods
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

export const DeleteRequestVerb = {
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
      name: 'Get All Users With Pagination And Filtering By Status And Creation Date And More Filters',
    },
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const Example = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [requests, setRequests] = useState([
        { id: 'r1', name: 'Get Users', method: 'GET', url: 'https://api.example.com/users' },
        { id: 'r2', name: 'Create User', method: 'POST', url: 'https://api.example.com/users' },
        { id: 'r3', name: 'Update User', method: 'PUT', url: 'https://api.example.com/users/1' },
        { id: 'r4', name: 'Delete User', method: 'DELETE', url: 'https://api.example.com/users/1' },
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
                    <span class={`text-xs text-white px-1.5 py-0.5 rounded ${
                      req.method === 'GET' ? 'bg-green-600' :
                      req.method === 'POST' ? 'bg-yellow-600' :
                      req.method === 'PUT' ? 'bg-blue-600' :
                      'bg-red-600'
                    }`}>
                      {req.method}
                    </span>
                    <div>
                      <p class="text-sm font-medium">{req.name}</p>
                      <p class="text-xs text-gray-500">{req.url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setIsOpen(true);
                    }}
                    class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-400 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {requests.length === 0 && (
            <p class="text-sm text-gray-500">All requests deleted!</p>
          )}

          <DeleteRequestModal
            isOpen={isOpen}
            request={selectedRequest}
            onClose={() => {
              setIsOpen(false);
              setSelectedRequest(null);
            }}
            onDelete={(deletedRequest) => {
              setRequests(requests.filter((r) => r.id !== deletedRequest.id));
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

// Multiple requests showcase
export const MultipleRequests = {
  render: () => {
    const Example = () => {
      const [currentIndex, setCurrentIndex] = useState(0);
      const requests = mockRequests;

      return (
        <div class="p-4">
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2">Preview different requests:</h3>
            <div class="flex flex-wrap gap-2">
              {requests.map((req, index) => (
                <button
                  key={req.id}
                  onClick={() => setCurrentIndex(index)}
                  class={`px-3 py-1 text-sm rounded cursor-pointer ${
                    index === currentIndex
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {req.method}
                </button>
              ))}
            </div>
          </div>

          <DeleteRequestModal
            isOpen={true}
            request={requests[currentIndex]}
            onClose={fn()}
            onDelete={fn()}
          />
        </div>
      );
    };

    return <Example />;
  },
};

// Request without name (shows URL instead)
export const RequestWithoutName = {
  args: {
    isOpen: true,
    request: {
      id: 'req-1',
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      name: '',
    },
  },
};

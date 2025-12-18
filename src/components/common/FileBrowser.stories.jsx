import { FileBrowser } from './FileBrowser';

export default {
  title: 'Common/FileBrowser',
  component: FileBrowser,
};

const sampleItems = [
  {
    name: 'Documents',
    type: 'directory',
  },
  {
    name: 'readme.txt',
    type: 'file',
  },
  {
    name: 'bin',
    type: 'directory',
    isSymlink: true,
  },
  {
    name: 'boot',
    type: 'directory',
  },
  {
    name: 'config.json',
    type: 'file',
  },
  {
    name: 'Pictures',
    type: 'directory',
  },
  {
    name: 'index.html',
    type: 'file',
  },
  {
    name: 'lib',
    type: 'directory',
    isSymlink: true,
  },
];

const sampleItemsWithParent = [
  {
    name: '..',
    type: 'directory',
  },
  ...sampleItems,
];

export const Default = {
  args: {
    items: sampleItems,
    onClick: (item) => {
      console.log('Single click:', item.name);
    },
    onDoubleClick: (item) => {
      console.log('Double click:', item.name);
    },
  },
};

export const WithParentDirectory = {
  args: {
    items: sampleItemsWithParent,
    onClick: (item) => {
      console.log('Single click:', item.name);
    },
    onDoubleClick: (item) => {
      console.log('Double click:', item.name);
    },
  },
};

export const AlphabeticalSort = {
  args: {
    items: sampleItems,
    sort: 'alphabetical',
    onClick: (item) => {
      console.log('Single click:', item.name);
    },
    onDoubleClick: (item) => {
      console.log('Double click:', item.name);
    },
  },
};

export const AlphabeticalWithParent = {
  args: {
    items: sampleItemsWithParent,
    sort: 'alphabetical',
    onClick: (item) => {
      console.log('Single click:', item.name);
    },
    onDoubleClick: (item) => {
      console.log('Double click:', item.name);
    },
  },
};

export const Empty = {
  args: {
    items: [],
  },
};

export const OnlyDirectories = {
  args: {
    items: [
      {
        name: '..',
        type: 'directory',
      },
      {
        name: 'Documents',
        type: 'directory',
      },
      {
        name: 'Pictures',
        type: 'directory',
      },
      {
        name: 'bin',
        type: 'directory',
        isSymlink: true,
      },
    ],
    sort: 'alphabetical',
  },
};

export const OnlyFiles = {
  args: {
    items: [
      {
        name: 'readme.txt',
        type: 'file',
      },
      {
        name: 'config.json',
        type: 'file',
      },
      {
        name: 'index.html',
        type: 'file',
      },
    ],
    sort: 'alphabetical',
  },
};

import { ImageViewer } from './ImageViewer';

export default {
  title: 'Common/ImageViewer',
  component: ImageViewer,
  parameters: {
    layout: 'padded',
  },
};

export const Default = {
  args: {},
};

export const WithOnChange = {
  args: {
    onChange: (file) => {
      console.log('File selected:', file);
    },
  },
};

export const CustomClassName = {
  args: {
    className: 'max-w-md',
  },
};

export const Readonly = {
  args: {
    variant: 'readonly',
  },
};

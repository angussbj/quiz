import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
  async viteFinal(baseConfig) {
    return {
      ...baseConfig,
      base: '/',
      plugins: (baseConfig.plugins ?? []).filter(
        (p) => !(p && 'name' in p && p.name === 'redirect-root'),
      ),
    };
  },
};

export default config;

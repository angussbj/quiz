import type { Preview } from '@storybook/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import '../src/styles/global.css';

function StorybookTheme({
  children,
  theme,
}: {
  readonly children: ReactNode;
  readonly theme: 'light' | 'dark';
}) {
  const { setPreference } = useTheme();

  useEffect(() => {
    setPreference(theme);
  }, [setPreference, theme]);

  return children;
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const theme: 'light' | 'dark' = context.globals.theme ?? 'light';
      return (
        <ThemeProvider>
          <StorybookTheme theme={theme}>
            <Story />
          </StorybookTheme>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;

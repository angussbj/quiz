import type { Meta, StoryObj } from '@storybook/react';
import { MapRenderer } from '@/visualizations/map/MapRenderer';
import { sampleCityElements, sampleBackgroundPaths } from '@/visualizations/map/tests/sampleMapData';
import { LocateMode } from './LocateMode';

const meta: Meta<typeof LocateMode> = {
  title: 'Quiz Modes/LocateMode',
  component: LocateMode,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LocateMode>;

export const Default: Story = {
  args: {
    elements: sampleCityElements,
    toggles: { showBorders: true, showCityDots: false, showCountryNames: false },
    Renderer: MapRenderer,
    backgroundPaths: sampleBackgroundPaths,
  },
};

export const WithHints: Story = {
  args: {
    elements: sampleCityElements,
    toggles: { showBorders: true, showCityDots: true, showCountryNames: true },
    Renderer: MapRenderer,
    backgroundPaths: sampleBackgroundPaths,
  },
};

export const NoBorders: Story = {
  args: {
    elements: sampleCityElements,
    toggles: { showBorders: false, showCityDots: false, showCountryNames: false },
    Renderer: MapRenderer,
    backgroundPaths: sampleBackgroundPaths,
  },
};

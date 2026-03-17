import type { Meta, StoryObj } from '@storybook/react';
import { MapRenderer } from './MapRenderer';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { sampleCityElements, sampleBackgroundPaths } from './tests/sampleMapData';

const meta: Meta<typeof MapRenderer> = {
  title: 'Visualizations/MapRenderer',
  component: MapRenderer,
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

type Story = StoryObj<typeof MapRenderer>;

const defaultArgs: VisualizationRendererProps = {
  elements: sampleCityElements,
  elementStates: {},
  toggles: { showBorders: true, showCityDots: true, showCountryNames: true },
  backgroundPaths: sampleBackgroundPaths,
};

export const Default: Story = {
  args: defaultArgs,
};

export const WithElementStates: Story = {
  args: {
    ...defaultArgs,
    elementStates: {
      paris: 'correct',
      berlin: 'incorrect',
      madrid: 'highlighted',
      rome: 'revealed',
    },
  },
};

export const NoBorders: Story = {
  args: {
    ...defaultArgs,
    toggles: { showBorders: false, showCityDots: true, showCountryNames: true },
  },
};

export const DotsOnly: Story = {
  args: {
    ...defaultArgs,
    toggles: { showBorders: false, showCityDots: true, showCountryNames: false },
  },
};

export const LabelsOnly: Story = {
  args: {
    ...defaultArgs,
    toggles: { showBorders: true, showCityDots: false, showCountryNames: true },
  },
};

export const WithTarget: Story = {
  args: {
    ...defaultArgs,
    targetElementId: 'paris',
    toggles: { showBorders: true, showCityDots: true, showCountryNames: false },
  },
};

export const SomeHidden: Story = {
  args: {
    ...defaultArgs,
    elementStates: {
      paris: 'hidden',
      berlin: 'hidden',
    },
    toggles: { showBorders: true, showCityDots: true, showCountryNames: true },
  },
};

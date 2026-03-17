import type { Meta, StoryObj } from '@storybook/react';
import { Timer } from './Timer';

const meta: Meta<typeof Timer> = {
  title: 'Quiz Modes/Timer',
  component: Timer,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Timer>;

export const Elapsed: Story = {
  args: {},
};

export const Countdown: Story = {
  args: {
    countdownSeconds: 120,
  },
};

export const ShortCountdown: Story = {
  args: {
    countdownSeconds: 10,
    onExpire: () => alert('Time is up!'),
  },
};

export const Paused: Story = {
  args: {
    paused: true,
  },
};

export const CountdownPaused: Story = {
  args: {
    countdownSeconds: 45,
    paused: true,
  },
};

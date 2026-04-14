import type { Meta, StoryObj } from '@storybook/react';
import { EmotionTimeline } from './EmotionTimeline';

const meta: Meta<typeof EmotionTimeline> = {
  title: 'Therapy/EmotionTimeline',
  component: EmotionTimeline,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof EmotionTimeline>;

const startTime = Date.now() - 300_000; // 5 min ago

const mockEmotions = Array.from({ length: 60 }, (_, i) => ({
  timestamp: startTime + i * 5000,
  stress: 0.3 + Math.sin(i * 0.2) * 0.2 + Math.random() * 0.1,
  engagement: 0.6 + Math.cos(i * 0.15) * 0.15 + Math.random() * 0.1,
  valence: 0.5 + Math.sin(i * 0.1 + 1) * 0.2 + Math.random() * 0.1,
}));

export const Default: Story = {
  args: {
    emotions: mockEmotions,
    startTime,
    width: 800,
    height: 300,
  },
};

export const WithMarkers: Story = {
  args: {
    emotions: mockEmotions,
    startTime,
    width: 800,
    height: 300,
    markers: [
      { timestamp: startTime + 30_000, type: 'patient', label: 'Patient spoke' },
      { timestamp: startTime + 60_000, type: 'ai', label: 'AI response' },
      { timestamp: startTime + 120_000, type: 'phase', label: 'Phase: Desensitization' },
      { timestamp: startTime + 180_000, type: 'suds', label: 'SUDS: 6', value: 6 },
      { timestamp: startTime + 240_000, type: 'safety', label: 'Safety alert' },
    ],
  },
};

export const Empty: Story = {
  args: {
    emotions: [],
    startTime: Date.now(),
    width: 800,
    height: 300,
  },
};

export const Compact: Story = {
  args: {
    emotions: mockEmotions.slice(0, 20),
    startTime,
    width: 400,
    height: 200,
  },
};

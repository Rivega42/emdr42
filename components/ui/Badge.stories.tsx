import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['default', 'success', 'warning', 'danger', 'info'] },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'PATIENT' } };
export const Success: Story = { args: { children: 'COMPLETED', variant: 'success' } };
export const Warning: Story = { args: { children: 'IN_PROGRESS', variant: 'warning' } };
export const Danger: Story = { args: { children: 'ABORTED', variant: 'danger' } };
export const Info: Story = { args: { children: 'THERAPIST', variant: 'info' } };

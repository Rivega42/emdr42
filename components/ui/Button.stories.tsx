import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Начать сессию', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Отмена', variant: 'secondary' },
};

export const Danger: Story = {
  args: { children: 'Остановить', variant: 'danger' },
};

export const Loading: Story = {
  args: { children: 'Загрузка...', loading: true },
};

export const Disabled: Story = {
  args: { children: 'Недоступно', disabled: true },
};

export const Small: Story = {
  args: { children: 'Submit', size: 'sm' },
};

export const Large: Story = {
  args: { children: 'Get Started Free', size: 'lg' },
};

import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'you@example.com', label: 'Email' },
};

export const WithError: Story = {
  args: { placeholder: 'you@example.com', label: 'Email', error: 'Неверный формат email', value: 'not-an-email' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: '••••••••', label: 'Пароль' },
};

export const Disabled: Story = {
  args: { placeholder: 'Недоступно', label: 'Поле', disabled: true },
};

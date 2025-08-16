import { createFileRoute } from '@tanstack/react-router';
import { MinimalExample } from '../pages/MinimalExample';

export const Route = createFileRoute('/minimal')({
  component: MinimalExample,
});
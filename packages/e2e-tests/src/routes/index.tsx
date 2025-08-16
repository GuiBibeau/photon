import { createFileRoute } from '@tanstack/react-router';
import { UnifiedDashboard } from '../components/UnifiedDashboard';

export const Route = createFileRoute('/')({
  component: UnifiedDashboard,
});
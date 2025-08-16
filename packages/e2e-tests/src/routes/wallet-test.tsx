import { createFileRoute } from '@tanstack/react-router';
import { WalletTestPage } from '../pages/WalletTestPage';

export const Route = createFileRoute('/wallet-test')({
  component: WalletTestPage,
});
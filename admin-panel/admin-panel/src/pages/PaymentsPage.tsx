import { PageHeader } from '../components/PageHeader';
import { ComingSoon } from '../components/ComingSoon';

export function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <ComingSoon
        title="Payments are coming soon"
        note="Subscription billing, payout tracking, and transaction history will appear here."
      />
    </>
  );
}

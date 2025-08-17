import { useBilling } from '@/hooks/subscription/useBilling';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert } from '@/ui/primitives/alert';

export function InvoiceList(): React.ReactElement {
  const { paymentHistory, isLoading, error } = useBilling();

  if (isLoading) return <div>Loading invoices...</div>;
  if (error) return <Alert variant="destructive">{error}</Alert>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="list-disc pl-4 space-y-1 text-sm">
            {paymentHistory.map((inv) => (
              <li key={inv.id}>{inv.description} - ${inv.amount}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

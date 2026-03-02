import {
  InvoiceGenerator as HeadlessInvoiceGenerator,
  type InvoiceGeneratorProps,
} from '@/ui/headless/payment/InvoiceGenerator';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert } from '@/ui/primitives/alert';
import { Badge } from '@/ui/primitives/badge';
import { Download } from 'lucide-react';

export type StyledInvoiceGeneratorProps = Omit<InvoiceGeneratorProps, 'render'>;

export function InvoiceGenerator(props: StyledInvoiceGeneratorProps) {
  return (
    <HeadlessInvoiceGenerator
      {...props}
      render={({ invoices, isLoading, error, generateInvoice, downloadInvoice }) => (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive">{error}</Alert>}

            <Button onClick={generateInvoice} disabled={isLoading} className="mb-4">
              Generate New Invoice
            </Button>

            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">Invoice #{invoice.number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString()} - ${invoice.amount}
                    </p>
                    <Badge
                      variant={
                        invoice.status === 'paid'
                          ? 'default'
                          : invoice.status === 'overdue'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadInvoice(invoice.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}
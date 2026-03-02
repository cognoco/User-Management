import React from 'react';
import {
  PaymentHistory as HeadlessPaymentHistory,
  type PaymentHistoryProps,
} from '@/ui/headless/payment/PaymentHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert } from '@/ui/primitives/alert';
import { DataTable } from '@/ui/styled/common/DataTable';
import { Badge } from '@/ui/primitives/badge';

export type StyledPaymentHistoryProps = Omit<PaymentHistoryProps, 'render'>;

export function PaymentHistory(props: StyledPaymentHistoryProps) {
  return (
    <HeadlessPaymentHistory
      {...props}
      render={({ paymentHistory, isLoading, error }) => {
        if (isLoading) {
          return <div>Loading payment history...</div>;
        }

        if (error) {
          return <Alert variant="destructive">{error}</Alert>;
        }

        type FormattedPayment = {
          date: string;
          description: string;
          amount: string;
          status: 'succeeded' | 'failed' | 'pending';
          id: string;
        };

        const columns: Array<{
          key: keyof FormattedPayment;
          header: string;
          sortable: boolean;
          render?: (value: any, record: FormattedPayment) => React.ReactNode;
        }> = [
          { key: 'date', header: 'Date', sortable: true },
          { key: 'description', header: 'Description', sortable: true },
          { key: 'amount', header: 'Amount', sortable: true },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (status: string) => (
              <Badge
                variant={
                  status === 'succeeded'
                    ? 'default'
                    : status === 'failed'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {status}
              </Badge>
            ),
          },
        ];

        const formattedHistory = paymentHistory.map((payment) => ({
          ...payment,
          date: new Date(payment.date).toLocaleDateString(),
          amount: `$${payment.amount.toFixed(2)}`,
        }));

        return (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={formattedHistory}
                columns={columns}
                searchable
              />
            </CardContent>
          </Card>
        );
      }}
    />
  );
}
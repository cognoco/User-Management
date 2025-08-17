import React from 'react';
import { useTranslation } from 'react-i18next';
import { PaymentForm as HeadlessPaymentForm, type PaymentFormProps } from '@/ui/headless/payment/PaymentForm';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Alert } from '@/ui/primitives/alert';

export type StyledPaymentFormProps = Omit<PaymentFormProps, 'render'>;

export function PaymentForm(props: StyledPaymentFormProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <HeadlessPaymentForm
      {...props}
      render={({ register, handleSubmit, errors, isSubmitting, error }) => (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="cardNumber">{t('payment.cardNumber')}</Label>
            <Input
              id="cardNumber"
              {...register('cardNumber')}
              placeholder="1234 5678 9012 3456"
            />
            {errors.cardNumber && (
              <Alert variant="destructive">
                {String(errors.cardNumber.message)}
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">{t('payment.expiryDate')}</Label>
              <Input
                id="expiryDate"
                {...register('expiryDate')}
                placeholder="MM/YY"
              />
              {errors.expiryDate && (
                <Alert variant="destructive">
                  {String(errors.expiryDate.message)}
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cvv">{t('payment.cvv')}</Label>
              <Input
                id="cvv"
                type="password"
                {...register('cvv')}
                placeholder="123"
              />
              {errors.cvv && (
                <Alert variant="destructive">
                  {String(errors.cvv.message)}
                </Alert>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('payment.submit')}
          </Button>
        </form>
      )}
    />
  );
}
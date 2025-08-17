import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { BusinessSSOAuth as HeadlessBusinessSSOAuth, type BusinessSSOAuthProps as HeadlessProps } from '@/ui/headless/auth/BusinessSSOAuth';

export interface BusinessSSOAuthProps extends Omit<HeadlessProps, 'children'> {
  className?: string;
}

export function BusinessSSOAuth({ className, ...props }: BusinessSSOAuthProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <HeadlessBusinessSSOAuth {...props}>
      {({
        domainValue,
        setDomainValue,
        handleSubmit,
        isSubmitting,
        isValid,
        errors,
        touched,
        handleBlur,
        availableProviders,
        initiateProviderLogin
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{t('auth.sso.title', 'Single Sign-On')}</CardTitle>
            <CardDescription>{t('auth.sso.description', 'Sign in using your company credentials')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.form && (
              <Alert variant="destructive">
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="domain" className="text-sm font-medium">
                  {t('auth.sso.domain', 'Company Domain')}
                </label>
                <Input
                  id="domain"
                  value={domainValue}
                  onChange={(e) => setDomainValue(e.target.value)}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                />
                {touched.domain && errors.domain && (
                  <p className="text-sm text-red-500">{errors.domain}</p>
                )}
              </div>
              <Button type="submit" disabled={!isValid || isSubmitting} className="w-full">
                {isSubmitting ? t('common.loading') : t('auth.sso.continue', 'Continue')}
              </Button>
            </form>
            {availableProviders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('auth.sso.chooseProvider', 'Choose a provider')}
                </p>
                <div className="flex flex-col gap-2">
                  {availableProviders.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      onClick={() => initiateProviderLogin(p.id)}
                      disabled={isSubmitting}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </HeadlessBusinessSSOAuth>
  );
}

export default BusinessSSOAuth;

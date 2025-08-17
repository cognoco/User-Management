import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/ui/primitives/card';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { BusinessSSOSetup as HeadlessBusinessSSOSetup, type BusinessSSOSetupProps as HeadlessProps } from '@/ui/headless/auth/BusinessSSOSetup';

export interface BusinessSSOSetupProps extends Omit<HeadlessProps, 'children'> {
  className?: string;
}

export function BusinessSSOSetup({ className, ...props }: BusinessSSOSetupProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <HeadlessBusinessSSOSetup {...props}>
      {({
        availableProviders,
        selectedProvider,
        selectProvider,
        configValues,
        setConfigValue,
        handleSubmit,
        isSubmitting,
        isValid,
        errors,
        touched,
        handleBlur
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{t('org.sso.setupTitle', 'Configure SSO')}</CardTitle>
            <CardDescription>{t('org.sso.setupDescription', 'Set up Single Sign-On for your organization')}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errors.form && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.form}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <label htmlFor="provider" className="text-sm font-medium">
                  {t('org.sso.provider', 'Provider')}
                </label>
                <select
                  id="provider"
                  value={selectedProvider?.id ?? ''}
                  onChange={(e) => selectProvider(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full border rounded p-2"
                >
                  <option value="">{t('org.sso.selectProvider', 'Select provider')}</option>
                  {availableProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProvider && selectedProvider.configFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label htmlFor={field.id} className="text-sm font-medium">
                    {field.name}
                  </label>
                  <Input
                    id={field.id}
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={configValues[field.id] || ''}
                    onChange={(e) => setConfigValue(field.id, e.target.value)}
                    onBlur={() => handleBlur(field.id)}
                    disabled={isSubmitting}
                  />
                  {touched[field.id] && errors.config?.[field.id] && (
                    <p className="text-sm text-red-500">{errors.config[field.id]}</p>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={!isValid || isSubmitting} className="ml-auto">
                {isSubmitting ? t('common.loading') : t('common.save')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </HeadlessBusinessSSOSetup>
  );
}

export default BusinessSSOSetup;

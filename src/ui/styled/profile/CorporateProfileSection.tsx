import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserType, Company } from '@/types/user-type';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Separator } from '@/ui/primitives/separator';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { CompanyLogoUpload } from './CompanyLogoUpload';
import HeadlessCorporateProfileSection from '@/ui/headless/profile/CorporateProfileSection';

interface Props {
  userType: UserType;
  company?: Company & { verificationStatus?: string; isAdmin?: boolean };
  onUpdate: (company: Company) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function CorporateProfileSection(props: Props): React.ReactElement {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const isAdmin = props.company?.isAdmin ?? true;

  return (
    <HeadlessCorporateProfileSection {...props}>
      {({ form, handleSubmit, isLoading, error, pendingVerification }) => (
        !editMode ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('profile.corporate.title')}</CardTitle>
              <CardDescription>{t('profile.corporate.description')}</CardDescription>
            </CardHeader>
            {success && (
              <CardContent>
                <Alert role="alert">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              </CardContent>
            )}
            {error && (
              <CardContent>
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </CardContent>
            )}
            <CardContent className="flex flex-col items-center pt-0 pb-6">
              <h3 className="text-lg font-medium mb-4 self-start">{t('profile.corporate.companyLogo')}</h3>
              <CompanyLogoUpload />
              <Separator className="mt-6" />
            </CardContent>
            <CardContent className="space-y-6 pt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('profile.corporate.companyDetails')}</h3>
                <div className="space-y-2">
                  <Label>{t('profile.corporate.companyName')} *</Label>
                  <div>{props.company?.name || <span className="text-muted-foreground">{t('profile.corporate.missing', 'Not set')}</span>}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('profile.corporate.industry')}</Label>
                    <div>{props.company?.industry || <span className="text-muted-foreground">{t('profile.corporate.missing', 'Not set')}</span>}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('profile.corporate.companySize')}</Label>
                    <div>{props.company?.size || <span className="text-muted-foreground">{t('profile.corporate.missing', 'Not set')}</span>}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('profile.corporate.website')}</Label>
                  <div>{props.company?.website || <span className="text-muted-foreground">{t('profile.corporate.missing', 'Not set')}</span>}</div>
                </div>
                <div className="space-y-2">
                  <Label>{t('profile.corporate.vatId')}</Label>
                  <div>{props.company?.vatId || <span className="text-muted-foreground">{t('profile.corporate.missing', 'Not set')}</span>}</div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('profile.corporate.verificationStatus')}</h3>
                <div>{props.company?.verificationStatus || <span className="text-muted-foreground">{t('profile.corporate.verificationUnknown', 'Unknown')}</span>}</div>
                {pendingVerification && (
                  <div className="text-warning text-sm mt-2">{t('profile.corporate.pendingVerification', 'Changes require re-verification.')}</div>
                )}
              </div>
            </CardContent>
            {isAdmin && (
              <CardFooter className="flex justify-end">
                <Button type="button" onClick={() => setEditMode(true)}>{t('common.edit', 'Edit')}</Button>
              </CardFooter>
            )}
          </Card>
        ) : (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('profile.corporate.title')}</CardTitle>
              <CardDescription>{t('profile.corporate.description')}</CardDescription>
            </CardHeader>
            {success && (
              <CardContent>
                <Alert role="alert">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              </CardContent>
            )}
            {error && (
              <CardContent>
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </CardContent>
            )}
            <CardContent className="flex flex-col items-center pt-0 pb-6">
              <h3 className="text-lg font-medium mb-4 self-start">{t('profile.corporate.companyLogo')}</h3>
              <CompanyLogoUpload />
              <Separator className="mt-6" />
            </CardContent>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 pt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('profile.corporate.companyDetails')}</h3>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('profile.corporate.companyName')} *</Label>
                    <Input id="name" {...form.register('name')} />
                    {form.formState.errors.name && (
                      <p className="text-destructive text-sm" role="alert">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">{t('profile.corporate.industry')}</Label>
                      <Input id="industry" {...form.register('industry')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size">{t('profile.corporate.companySize')}</Label>
                      <select id="size" className="w-full px-3 py-2 border rounded-md" {...form.register('size')}>
                        <option value="">{t('profile.corporate.selectCompanySize')}</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="501-1000">501-1000</option>
                        <option value="1000+">1000+</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">{t('profile.corporate.website')}</Label>
                    <Input id="website" placeholder="https://example.com" {...form.register('website')} />
                    {form.formState.errors.website && (
                      <p className="text-destructive text-sm" role="alert">{form.formState.errors.website.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatId">{t('profile.corporate.vatId')}</Label>
                    <Input id="vatId" {...form.register('vatId')} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('profile.corporate.companyAddress')}</h3>
                  <div className="space-y-2">
                    <Label htmlFor="street">{t('profile.corporate.street')}</Label>
                    <Input id="street" {...form.register('address.street')} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">{t('profile.corporate.city')}</Label>
                      <Input id="city" {...form.register('address.city')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">{t('profile.corporate.state')}</Label>
                      <Input id="state" {...form.register('address.state')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">{t('profile.corporate.postalCode')}</Label>
                      <Input id="postalCode" {...form.register('address.postalCode')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">{t('profile.corporate.country')}</Label>
                      <Input id="country" {...form.register('address.country')} />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setEditMode(false); setSuccess(null); form.reset(); }} disabled={isLoading}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('common.saving') : t('common.save')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )
      )}
    </HeadlessCorporateProfileSection>
  );
}

export default CorporateProfileSection;

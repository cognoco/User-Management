import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/ui/primitives/form';
import { Input } from '@/ui/primitives/input';
import { Switch } from '@/ui/primitives/switch';
import { Separator } from '@/ui/primitives/separator';
import { Building, Globe, Plus, Trash, Check } from 'lucide-react';
import { api } from '@/lib/api/axios';
import { Badge } from '@/ui/primitives/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table';
import { Skeleton } from '@/ui/primitives/skeleton';

// Form schema for adding domains
const domainSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'Enter a valid domain (e.g. example.com)'),
  autoJoin: z.boolean().default(true),
  enforceSSO: z.boolean().default(false),
});

type DomainFormValues = z.infer<typeof domainSchema>;

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  autoJoin: boolean;
  enforceSSO: boolean;
  createdAt: string;
}

interface DomainBasedOrgMatchingProps {
  organizationId: string;
}

export function DomainBasedOrgMatching({ organizationId }: DomainBasedOrgMatchingProps) {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationInProgress, setVerificationInProgress] = useState<string | null>(null);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema) as Resolver<DomainFormValues>,
    defaultValues: {
      domain: '',
      autoJoin: true,
      enforceSSO: false,
    },
  });

  // Fetch organization domains
  useEffect(() => {
    fetchDomains();
  }, [organizationId]);

  const fetchDomains = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/api/organizations/${organizationId}/domains`);
      setDomains(response.data.domains);
    } catch (error: any) {
      setError(error.response?.data?.error || t('org.domains.fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: DomainFormValues) => {
    try {
      // Validate domain format before proceeding
      const result = domainSchema.safeParse(values);
      if (!result.success) {
        setError(t('org.domains.invalidDomain'));
        return;
      }

      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await api.post(`/api/organizations/${organizationId}/domains`, values);
      setSuccess(t('org.domains.addSuccess', { domain: values.domain }));
      form.reset();
      fetchDomains();
    } catch (error: any) {
      setError(error.response?.data?.error || t('org.domains.addError'));
    } finally {
      setIsLoading(false);
    }
  };

  const removeDomain = async (domainId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await api.delete(`/api/organizations/${organizationId}/domains/${domainId}`);
      setSuccess(t('org.domains.removeSuccess'));
      fetchDomains();
    } catch (error: any) {
      setError(error.response?.data?.error || t('org.domains.removeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const verifyDomain = async (domainId: string) => {
    try {
      setVerificationInProgress(domainId);
      setError(null);
      setSuccess(null);
      
      await api.post(`/api/organizations/${organizationId}/domains/${domainId}/verify`);
      setSuccess(t('org.domains.verifySuccess'));
      fetchDomains();
    } catch (error: any) {
      setError(error.response?.data?.error || t('org.domains.verifyError'));
    } finally {
      setVerificationInProgress(null);
    }
  };

  const toggleDomainSetting = async (domainId: string, field: 'autoJoin' | 'enforceSSO', value: boolean) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await api.patch(`/api/organizations/${organizationId}/domains/${domainId}`, {
        [field]: value
      });
      
      // Update local state
      setDomains(domains.map(domain => 
        domain.id === domainId ? { ...domain, [field]: value } : domain
      ));
    } catch (error: any) {
      setError(error.response?.data?.error || t('org.domains.updateError'));
      // Refetch to restore correct state
      fetchDomains();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          {t('org.domains.title')}
        </CardTitle>
        <CardDescription>
          {t('org.domains.description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Current domains list */}
        <div>
          <h3 className="text-lg font-medium mb-3">{t('org.domains.currentDomains')}</h3>
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center p-6 border rounded-md border-dashed">
              <Globe className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('org.domains.noDomains')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('org.domains.domain')}</TableHead>
                  <TableHead>{t('org.domains.status')}</TableHead>
                  <TableHead>{t('org.domains.autoJoin')}</TableHead>
                  <TableHead>{t('org.domains.enforceSSO')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell>
                      {domain.verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" /> {t('org.domains.verified')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                          {t('org.domains.unverified')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={domain.autoJoin}
                        onCheckedChange={(checked) => toggleDomainSetting(domain.id, 'autoJoin', checked)}
                        disabled={isLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={domain.enforceSSO}
                        onCheckedChange={(checked) => toggleDomainSetting(domain.id, 'enforceSSO', checked)}
                        disabled={isLoading || !domain.verified}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!domain.verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => verifyDomain(domain.id)}
                            disabled={verificationInProgress === domain.id}
                          >
                            {verificationInProgress === domain.id ? (
                              <span>{t('common.loading')}</span>
                            ) : (
                              <span>{t('org.domains.verify')}</span>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeDomain(domain.id)}
                          disabled={isLoading}
                          aria-label={t('org.domains.deleteDomain', { domain: domain.domain })}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Separator />

        {/* Add new domain form */}
        <div>
          <h3 className="text-lg font-medium mb-3">{t('org.domains.addDomain')}</h3>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('org.domains.domainLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder="example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('org.domains.domainDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="autoJoin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel>{t('org.domains.autoJoinLabel')}</FormLabel>
                        <FormDescription>
                          {t('org.domains.autoJoinDescription')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enforceSSO"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel>{t('org.domains.enforceSSOLabel')}</FormLabel>
                        <FormDescription>
                          {t('org.domains.enforceSSODescription')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" disabled={isLoading} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                {t('org.domains.addButton')}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/50 px-6 py-4 flex flex-col items-start">
        <h4 className="font-medium mb-2">{t('org.domains.verificationTitle')}</h4>
        <p className="text-sm text-muted-foreground mb-2">
          {t('org.domains.verificationDescription')}
        </p>
        <Alert className="mt-2 w-full">
          <AlertDescription className="text-xs">
            {t('org.domains.verificationInstructions')}
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
} 
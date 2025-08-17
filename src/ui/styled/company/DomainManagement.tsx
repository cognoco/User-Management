'use client';

import React, { useState, useEffect } from 'react';
import { CompanyDomain } from '@/types/company';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/primitives/card';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Badge } from '@/ui/primitives/badge';
import { api } from '@/lib/api/axios';
import { useToast } from '@/lib/hooks/use-toast';
import { CheckCircle, Clock, AlertCircle, Loader2, Plus, Trash, Globe, Shield, Star } from 'lucide-react';
import { Input } from '@/ui/primitives/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/ui/primitives/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/primitives/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/primitives/dialog';
import { SingleDomainVerification } from '@/ui/styled/company/SingleDomainVerification';

interface DomainManagementProps {
  companyId: string;
  website?: string;
  onVerificationChange?: () => void;
}

const domainSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'Enter a valid domain (e.g. example.com)')
});

type FormValues = z.infer<typeof domainSchema>;

export function DomainManagement({ companyId, onVerificationChange }: DomainManagementProps) {
  const { toast } = useToast();
  const [domains, setDomains] = useState<CompanyDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<CompanyDomain | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      domain: ''
    }
  });

  const fetchDomains = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/company/domains');
      setDomains(response.data.domains || []);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch domains.';
      setError(errMsg);
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post('/api/company/domains', {
        domain: values.domain,
        companyId
      });
      
      form.reset(); // Reset the form
      setDomains([...domains, response.data]); // Add the new domain to the list
      setSuccess('Domain added successfully!');
      toast({ title: 'Success', description: 'Domain added successfully.' });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to add domain.';
      setError(errMsg);
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/api/company/domains/${domainId}`);
      setDomains(domains.filter(d => d.id !== domainId));
      setSuccess('Domain removed successfully.');
      toast({ title: 'Success', description: 'Domain removed successfully.' });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to remove domain.';
      setError(errMsg);
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/api/company/domains/${domainId}`, {
        is_primary: true
      });
      
      // Update local state to reflect the change
      setDomains(domains.map(domain => ({
        ...domain,
        is_primary: domain.id === domainId
      })));
      
      setSuccess('Primary domain updated successfully.');
      toast({ title: 'Success', description: 'Primary domain updated.' });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to update primary domain.';
      setError(errMsg);
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = (domain: CompanyDomain) => {
    setSelectedDomain(domain);
    setShowVerificationDialog(true);
  };

  const renderStatus = (domain: CompanyDomain) => {
    if (domain.is_verified) {
      return (
        <Badge variant="secondary" className="flex items-center space-x-1 text-green-600 border-green-300">
          <CheckCircle className="h-4 w-4" />
          <span>Verified</span>
        </Badge>
      );
    } else if (domain.verification_token) {
      return (
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>Pending</span>
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="flex items-center space-x-1">
          <AlertCircle className="h-4 w-4" />
          <span>Not Verified</span>
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Domain Management</CardTitle>
            <CardDescription>Manage domains for your company. Verified domains can be used for automatic user matching.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {domains.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map(domain => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    {domain.domain}
                  </TableCell>
                  <TableCell>{renderStatus(domain)}</TableCell>
                  <TableCell>
                    {domain.is_primary ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        <Star className="h-3 w-3 mr-1 fill-amber-500" />
                        Primary
                      </Badge>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSetPrimary(domain.id)}
                        disabled={isLoading}
                      >
                        Set as Primary
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleVerifyDomain(domain)}
                              disabled={isLoading || domain.is_verified}
                            >
                              <Shield className={domain.is_verified ? "h-4 w-4 text-green-600" : "h-4 w-4"} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {domain.is_verified ? 'Already verified' : 'Verify domain'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteDomain(domain.id)}
                              disabled={isLoading}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Remove domain
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center p-4 border rounded-md bg-muted/20">
            <p className="text-sm text-muted-foreground">No domains have been added yet.</p>
          </div>
        )}

        <div className="pt-4">
          <h3 className="text-sm font-medium mb-3">Add New Domain</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddDomain)} className="flex gap-2">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Domain
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>

      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Domain: {selectedDomain?.domain}</DialogTitle>
          </DialogHeader>
          {selectedDomain && (
            <SingleDomainVerification 
              domain={selectedDomain} 
              onVerificationComplete={() => {
                fetchDomains();
                setShowVerificationDialog(false);
                onVerificationChange?.();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
} 
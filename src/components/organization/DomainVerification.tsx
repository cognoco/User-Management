import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Badge } from '@/ui/primitives/badge';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select';
import {
  Shield,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  Info,
  FileText,
  Mail,
  Server,
} from 'lucide-react';

export interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  verificationMethod: 'dns_txt' | 'dns_cname' | 'email' | 'file';
  verificationToken: string;
  verificationRecord?: {
    type: string;
    name: string;
    value: string;
  };
  verifiedAt?: Date;
  expiresAt?: Date;
  isPrimary: boolean;
  createdAt: Date;
  lastCheckedAt?: Date;
  error?: string;
}

interface DomainVerificationProps {
  organizationId: string;
  domains?: Domain[];
  onAddDomain: (domain: string, method: Domain['verificationMethod']) => Promise<Domain>;
  onVerifyDomain: (domainId: string) => Promise<{ verified: boolean; error?: string }>;
  onRemoveDomain: (domainId: string) => Promise<void>;
  onSetPrimaryDomain: (domainId: string) => Promise<void>;
  onRefreshStatus?: (domainId: string) => Promise<Domain>;
  maxDomains?: number;
  allowMultipleDomains?: boolean;
}

export function DomainVerification({
  organizationId,
  domains = [],
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
  onSetPrimaryDomain,
  onRefreshStatus,
  maxDomains = 5,
  allowMultipleDomains = true,
}: DomainVerificationProps): React.ReactElement {
  const [domainList, setDomainList] = useState<Domain[]>(domains);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<Domain['verificationMethod']>('dns_txt');
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    setDomainList(domains);
  }, [domains]);

  const handleAddDomain = async (): Promise<void> => {
    if (!newDomain) return;
    
    setIsAddingDomain(true);
    setError(null);
    try {
      const domain = await onAddDomain(newDomain, verificationMethod);
      setDomainList([...domainList, domain]);
      setNewDomain('');
    } catch (err) {
      setError('Failed to add domain. Please try again.');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domain: Domain): Promise<void> => {
    setIsVerifying(domain.id);
    setError(null);
    try {
      const result = await onVerifyDomain(domain.id);
      if (result.verified) {
        setDomainList(domainList.map(d => 
          d.id === domain.id 
            ? { ...d, status: 'verified', verifiedAt: new Date() }
            : d
        ));
      } else {
        setDomainList(domainList.map(d => 
          d.id === domain.id 
            ? { ...d, status: 'failed', error: result.error }
            : d
        ));
        setError(result.error || 'Verification failed. Please check your configuration.');
      }
    } catch (err) {
      setError('Failed to verify domain. Please try again.');
    } finally {
      setIsVerifying(null);
    }
  };

  const handleRemoveDomain = async (domain: Domain): Promise<void> => {
    if (domain.isPrimary) {
      setError('Cannot remove primary domain. Set another domain as primary first.');
      return;
    }
    
    setIsRemoving(domain.id);
    try {
      await onRemoveDomain(domain.id);
      setDomainList(domainList.filter(d => d.id !== domain.id));
    } catch (err) {
      setError('Failed to remove domain.');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleSetPrimary = async (domain: Domain): Promise<void> => {
    if (domain.status !== 'verified') {
      setError('Only verified domains can be set as primary.');
      return;
    }
    
    try {
      await onSetPrimaryDomain(domain.id);
      setDomainList(domainList.map(d => ({
        ...d,
        isPrimary: d.id === domain.id,
      })));
    } catch (err) {
      setError('Failed to set primary domain.');
    }
  };

  const handleRefreshStatus = async (domain: Domain): Promise<void> => {
    if (!onRefreshStatus) return;
    
    setIsRefreshing(domain.id);
    try {
      const updated = await onRefreshStatus(domain.id);
      setDomainList(domainList.map(d => 
        d.id === domain.id ? updated : d
      ));
    } catch (err) {
      setError('Failed to refresh domain status.');
    } finally {
      setIsRefreshing(null);
    }
  };

  const copyToClipboard = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusBadge = (status: Domain['status']): React.ReactElement => {
    const configs = {
      pending: { variant: 'secondary' as const, icon: AlertTriangle, text: 'Pending' },
      verified: { variant: 'default' as const, icon: CheckCircle, text: 'Verified' },
      failed: { variant: 'destructive' as const, icon: XCircle, text: 'Failed' },
      expired: { variant: 'outline' as const, icon: AlertTriangle, text: 'Expired' },
    };
    
    const config = configs[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getVerificationInstructions = (domain: Domain): React.ReactElement => {
    switch (domain.verificationMethod) {
      case 'dns_txt':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">DNS TXT Record Verification</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Log in to your DNS provider's control panel</li>
              <li>Add a new TXT record with these values:</li>
            </ol>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Record Type</p>
                  <p className="font-mono">TXT</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('TXT', 'type')}
                >
                  {copiedText === 'type' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Name/Host</p>
                  <p className="font-mono">_verification.{domain.domain}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`_verification.${domain.domain}`, 'name')}
                >
                  {copiedText === 'name' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Value/Data</p>
                  <p className="font-mono text-xs break-all">{domain.verificationToken}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(domain.verificationToken, 'value')}
                >
                  {copiedText === 'value' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                DNS changes may take up to 48 hours to propagate. You can verify immediately after adding the record.
              </AlertDescription>
            </Alert>
          </div>
        );
        
      case 'dns_cname':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">DNS CNAME Record Verification</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Log in to your DNS provider's control panel</li>
              <li>Add a new CNAME record with these values:</li>
            </ol>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Record Type</p>
                  <p className="font-mono">CNAME</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('CNAME', 'type')}
                >
                  {copiedText === 'type' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Name/Host</p>
                  <p className="font-mono">_verification.{domain.domain}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`_verification.${domain.domain}`, 'name')}
                >
                  {copiedText === 'name' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Target/Points to</p>
                  <p className="font-mono text-xs">verify.yourdomain.com</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('verify.yourdomain.com', 'target')}
                >
                  {copiedText === 'target' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 'email':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">Email Verification</h4>
            <p className="text-sm text-muted-foreground">
              We'll send a verification email to the domain administrator.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">Verification email will be sent to:</p>
              <ul className="mt-2 space-y-1">
                <li className="font-mono text-sm">admin@{domain.domain}</li>
                <li className="font-mono text-sm">webmaster@{domain.domain}</li>
                <li className="font-mono text-sm">postmaster@{domain.domain}</li>
              </ul>
            </div>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Make sure at least one of these email addresses is configured to receive emails.
              </AlertDescription>
            </Alert>
          </div>
        );
        
      case 'file':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">File Upload Verification</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create a text file with the verification token</li>
              <li>Upload it to your website's root directory</li>
            </ol>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">File Name</p>
                <p className="font-mono">verification.txt</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">File Content</p>
                <p className="font-mono text-xs break-all">{domain.verificationToken}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">File Location</p>
                <p className="font-mono text-xs">https://{domain.domain}/verification.txt</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => copyToClipboard(domain.verificationToken, 'token')}
            >
              {copiedText === 'token' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Verification Token
                </>
              )}
            </Button>
          </div>
        );
        
      default:
        return <div>Unknown verification method</div>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Domain Verification
              </CardTitle>
              <CardDescription>
                Verify ownership of your domains to enable SSO and other features
              </CardDescription>
            </div>
            {allowMultipleDomains && domainList.length < maxDomains && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Domain</DialogTitle>
                    <DialogDescription>
                      Enter your domain and choose a verification method
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain</Label>
                      <Input
                        id="domain"
                        placeholder="example.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="method">Verification Method</Label>
                      <Select
                        value={verificationMethod}
                        onValueChange={(value) => setVerificationMethod(value as Domain['verificationMethod'])}
                      >
                        <SelectTrigger id="method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dns_txt">
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4" />
                              DNS TXT Record
                            </div>
                          </SelectItem>
                          <SelectItem value="dns_cname">
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4" />
                              DNS CNAME Record
                            </div>
                          </SelectItem>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email Verification
                            </div>
                          </SelectItem>
                          <SelectItem value="file">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              File Upload
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddDomain}
                      disabled={!newDomain || isAddingDomain}
                    >
                      {isAddingDomain ? 'Adding...' : 'Add Domain'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {domainList.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No domains configured</p>
              {allowMultipleDomains && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Domain
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Domain</DialogTitle>
                      <DialogDescription>
                        Enter your domain and choose a verification method
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-domain">Domain</Label>
                        <Input
                          id="first-domain"
                          placeholder="example.com"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first-method">Verification Method</Label>
                        <Select
                          value={verificationMethod}
                          onValueChange={(value) => setVerificationMethod(value as Domain['verificationMethod'])}
                        >
                          <SelectTrigger id="first-method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dns_txt">DNS TXT Record</SelectItem>
                            <SelectItem value="dns_cname">DNS CNAME Record</SelectItem>
                            <SelectItem value="email">Email Verification</SelectItem>
                            <SelectItem value="file">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleAddDomain}
                        disabled={!newDomain || isAddingDomain}
                      >
                        {isAddingDomain ? 'Adding...' : 'Add Domain'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {domainList.map((domain) => (
                <Card key={domain.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg">{domain.domain}</h3>
                          {domain.isPrimary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                          {getStatusBadge(domain.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {domain.verifiedAt && (
                            <p>Verified: {new Date(domain.verifiedAt).toLocaleDateString()}</p>
                          )}
                          {domain.lastCheckedAt && (
                            <p>Last checked: {new Date(domain.lastCheckedAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {domain.status === 'verified' && !domain.isPrimary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetPrimary(domain)}
                          >
                            Set as Primary
                          </Button>
                        )}
                        {onRefreshStatus && domain.status !== 'verified' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRefreshStatus(domain)}
                            disabled={isRefreshing === domain.id}
                          >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing === domain.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDomain(domain)}
                          disabled={isRemoving === domain.id || domain.isPrimary}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {domain.status === 'pending' && (
                      <Tabs defaultValue="instructions" className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="instructions">Instructions</TabsTrigger>
                          <TabsTrigger value="verify">Verify</TabsTrigger>
                        </TabsList>
                        <TabsContent value="instructions" className="mt-4">
                          {getVerificationInstructions(domain)}
                        </TabsContent>
                        <TabsContent value="verify" className="mt-4">
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Once you've completed the verification setup, click the button below to verify your domain.
                            </p>
                            <Button
                              onClick={() => handleVerifyDomain(domain)}
                              disabled={isVerifying === domain.id}
                              className="w-full"
                            >
                              {isVerifying === domain.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Verify Domain
                                </>
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}

                    {domain.status === 'failed' && domain.error && (
                      <Alert variant="destructive" className="mt-4">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Verification Failed</AlertTitle>
                        <AlertDescription>{domain.error}</AlertDescription>
                      </Alert>
                    )}

                    {domain.status === 'expired' && (
                      <Alert variant="default" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Verification Expired</AlertTitle>
                        <AlertDescription>
                          This domain verification has expired. Please reverify your domain.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
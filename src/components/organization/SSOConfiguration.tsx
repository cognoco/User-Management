import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Badge } from '@/ui/primitives/badge';
import { Switch } from '@/ui/primitives/switch';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Textarea } from '@/ui/primitives/textarea';
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
  Key,
  Shield,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  ExternalLink,
  Info,
  Settings,
  Users,
  Lock,
} from 'lucide-react';

export interface SSOProvider {
  id: string;
  type: 'saml' | 'oidc' | 'google' | 'microsoft' | 'okta' | 'auth0';
  name: string;
  enabled: boolean;
  configuration: {
    // SAML Config
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
    
    // OIDC Config
    clientId?: string;
    clientSecret?: string;
    issuerUrl?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    scopes?: string[];
    
    // Common
    domainWhitelist?: string[];
    attributeMapping?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      groups?: string;
    };
    autoProvision?: boolean;
    defaultRole?: string;
    allowIdpInitiated?: boolean;
  };
  metadata?: {
    lastSync?: Date;
    totalUsers?: number;
    activeUsers?: number;
    lastError?: string;
  };
}

interface SSOConfigurationProps {
  organizationId: string;
  providers?: SSOProvider[];
  verifiedDomains?: string[];
  onSaveProvider: (provider: SSOProvider) => Promise<void>;
  onDeleteProvider: (providerId: string) => Promise<void>;
  onTestConnection: (providerId: string) => Promise<{ success: boolean; error?: string }>;
  onDownloadMetadata?: () => Promise<string>;
  onUploadMetadata?: (file: File) => Promise<void>;
  allowMultipleProviders?: boolean;
  maxProviders?: number;
}

export function SSOConfiguration({
  organizationId,
  providers = [],
  verifiedDomains = [],
  onSaveProvider,
  onDeleteProvider,
  onTestConnection,
  onDownloadMetadata,
  onUploadMetadata,
  allowMultipleProviders = false,
  maxProviders = 3,
}: SSOConfigurationProps): React.ReactElement {
  const [providerList, setProviderList] = useState<SSOProvider[]>(providers);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SSOProvider | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [newProvider, setNewProvider] = useState<Partial<SSOProvider>>({
    type: 'saml',
    name: '',
    enabled: false,
    configuration: {
      autoProvision: true,
      defaultRole: 'member',
      attributeMapping: {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        displayName: 'displayName',
      },
    },
  });

  const handleSaveProvider = async (): Promise<void> => {
    const providerToSave = editingProvider || newProvider;
    if (!providerToSave.name || !providerToSave.type) {
      setError('Provider name and type are required');
      return;
    }

    try {
      await onSaveProvider(providerToSave as SSOProvider);
      if (editingProvider) {
        setProviderList(providerList.map(p => 
          p.id === editingProvider.id ? providerToSave as SSOProvider : p
        ));
        setEditingProvider(null);
      } else {
        setProviderList([...providerList, { ...providerToSave, id: Date.now().toString() } as SSOProvider]);
        setIsAddingProvider(false);
        setNewProvider({
          type: 'saml',
          name: '',
          enabled: false,
          configuration: {
            autoProvision: true,
            defaultRole: 'member',
          },
        });
      }
      setSuccess('SSO provider saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save SSO provider');
    }
  };

  const handleDeleteProvider = async (provider: SSOProvider): Promise<void> => {
    try {
      await onDeleteProvider(provider.id);
      setProviderList(providerList.filter(p => p.id !== provider.id));
      setSuccess('SSO provider deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete SSO provider');
    }
  };

  const handleTestConnection = async (provider: SSOProvider): Promise<void> => {
    setTestingProvider(provider.id);
    setError(null);
    try {
      const result = await onTestConnection(provider.id);
      if (result.success) {
        setSuccess('Connection test successful!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Connection test failed');
      }
    } catch (err) {
      setError('Failed to test connection');
    } finally {
      setTestingProvider(null);
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

  const getCallbackUrl = (): string => {
    return `${window.location.origin}/api/auth/sso/callback/${organizationId}`;
  };

  const getMetadataUrl = (): string => {
    return `${window.location.origin}/api/auth/sso/metadata/${organizationId}`;
  };

  const renderProviderForm = (provider: Partial<SSOProvider>): React.ReactElement => {
    switch (provider.type) {
      case 'saml':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entity-id">Entity ID (Issuer)</Label>
              <Input
                id="entity-id"
                value={provider.configuration?.entityId || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, entityId: e.target.value }
                })}
                placeholder="https://your-idp.com/entity-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sso-url">SSO URL</Label>
              <Input
                id="sso-url"
                value={provider.configuration?.ssoUrl || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, ssoUrl: e.target.value }
                })}
                placeholder="https://your-idp.com/sso/saml"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate">X.509 Certificate</Label>
              <Textarea
                id="certificate"
                value={provider.configuration?.certificate || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, certificate: e.target.value }
                })}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature-algorithm">Signature Algorithm</Label>
              <Select
                value={provider.configuration?.signatureAlgorithm || 'sha256'}
                onValueChange={(value) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, signatureAlgorithm: value as any }
                })}
              >
                <SelectTrigger id="signature-algorithm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sha1">SHA-1</SelectItem>
                  <SelectItem value="sha256">SHA-256 (Recommended)</SelectItem>
                  <SelectItem value="sha512">SHA-512</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'oidc':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={provider.configuration?.clientId || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, clientId: e.target.value }
                })}
                placeholder="your-client-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                value={provider.configuration?.clientSecret || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, clientSecret: e.target.value }
                })}
                placeholder="your-client-secret"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-url">Issuer URL</Label>
              <Input
                id="issuer-url"
                value={provider.configuration?.issuerUrl || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, issuerUrl: e.target.value }
                })}
                placeholder="https://your-idp.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scopes">Scopes</Label>
              <Input
                id="scopes"
                value={provider.configuration?.scopes?.join(' ') || 'openid email profile'}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, scopes: e.target.value.split(' ') }
                })}
                placeholder="openid email profile"
              />
            </div>
          </div>
        );

      case 'google':
      case 'microsoft':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oauth-client-id">Client ID</Label>
              <Input
                id="oauth-client-id"
                value={provider.configuration?.clientId || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, clientId: e.target.value }
                })}
                placeholder={provider.type === 'google' ? 'xxx.apps.googleusercontent.com' : 'your-app-id'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauth-client-secret">Client Secret</Label>
              <Input
                id="oauth-client-secret"
                type="password"
                value={provider.configuration?.clientSecret || ''}
                onChange={(e) => setNewProvider({
                  ...provider,
                  configuration: { ...provider.configuration, clientSecret: e.target.value }
                })}
                placeholder="your-client-secret"
              />
            </div>
            {verifiedDomains.length > 0 && (
              <div className="space-y-2">
                <Label>Allowed Domains</Label>
                <div className="space-y-2">
                  {verifiedDomains.map(domain => (
                    <div key={domain} className="flex items-center space-x-2">
                      <Switch
                        id={`domain-${domain}`}
                        checked={provider.configuration?.domainWhitelist?.includes(domain) || false}
                        onCheckedChange={(checked) => {
                          const whitelist = provider.configuration?.domainWhitelist || [];
                          setNewProvider({
                            ...provider,
                            configuration: {
                              ...provider.configuration,
                              domainWhitelist: checked
                                ? [...whitelist, domain]
                                : whitelist.filter(d => d !== domain)
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`domain-${domain}`} className="cursor-pointer">
                        {domain}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div>Select a provider type</div>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Single Sign-On (SSO)
              </CardTitle>
              <CardDescription>
                Configure SSO providers for your organization
              </CardDescription>
            </div>
            {(allowMultipleProviders || providerList.length === 0) && providerList.length < maxProviders && (
              <Button onClick={() => setIsAddingProvider(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
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

          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {verifiedDomains.length === 0 && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Domain Verification Required</AlertTitle>
              <AlertDescription>
                Please verify at least one domain before configuring SSO providers.
              </AlertDescription>
            </Alert>
          )}

          {/* Service Provider Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Service Provider Information</CardTitle>
              <CardDescription className="text-xs">
                Use these URLs to configure your identity provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">ACS URL / Callback URL</p>
                  <p className="font-mono text-xs break-all">{getCallbackUrl()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(getCallbackUrl(), 'callback')}
                >
                  {copiedText === 'callback' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Metadata URL</p>
                  <p className="font-mono text-xs break-all">{getMetadataUrl()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(getMetadataUrl(), 'metadata')}
                >
                  {copiedText === 'metadata' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {onDownloadMetadata && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onDownloadMetadata}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download SP Metadata
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Provider List */}
          {providerList.length > 0 ? (
            <div className="space-y-4">
              {providerList.map((provider) => (
                <Card key={provider.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{provider.name}</h3>
                          <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                            {provider.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline">{provider.type.toUpperCase()}</Badge>
                        </div>
                        {provider.metadata && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            {provider.metadata.totalUsers && (
                              <p>Total Users: {provider.metadata.totalUsers}</p>
                            )}
                            {provider.metadata.lastSync && (
                              <p>Last Sync: {new Date(provider.metadata.lastSync).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(provider)}
                          disabled={testingProvider === provider.id}
                        >
                          {testingProvider === provider.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingProvider(provider)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteProvider(provider)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {provider.configuration.domainWhitelist && provider.configuration.domainWhitelist.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Allowed Domains</p>
                        <div className="flex flex-wrap gap-2">
                          {provider.configuration.domainWhitelist.map(domain => (
                            <Badge key={domain} variant="secondary">
                              {domain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No SSO providers configured</p>
              {verifiedDomains.length > 0 && (
                <Button onClick={() => setIsAddingProvider(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Configure SSO
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Provider Dialog */}
      <Dialog open={isAddingProvider || !!editingProvider} onOpenChange={(open) => {
        if (!open) {
          setIsAddingProvider(false);
          setEditingProvider(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Edit SSO Provider' : 'Add SSO Provider'}
            </DialogTitle>
            <DialogDescription>
              Configure your identity provider settings
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider-name">Provider Name</Label>
                <Input
                  id="provider-name"
                  value={(editingProvider || newProvider).name || ''}
                  onChange={(e) => {
                    const target = editingProvider || newProvider;
                    if (editingProvider) {
                      setEditingProvider({ ...target, name: e.target.value });
                    } else {
                      setNewProvider({ ...target, name: e.target.value });
                    }
                  }}
                  placeholder="e.g., Company SSO"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-type">Provider Type</Label>
                <Select
                  value={(editingProvider || newProvider).type}
                  onValueChange={(value) => {
                    const target = editingProvider || newProvider;
                    if (editingProvider) {
                      setEditingProvider({ ...target, type: value as any });
                    } else {
                      setNewProvider({ ...target, type: value as any });
                    }
                  }}
                  disabled={!!editingProvider}
                >
                  <SelectTrigger id="provider-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saml">SAML 2.0</SelectItem>
                    <SelectItem value="oidc">OpenID Connect</SelectItem>
                    <SelectItem value="google">Google Workspace</SelectItem>
                    <SelectItem value="microsoft">Microsoft Azure AD</SelectItem>
                    <SelectItem value="okta">Okta</SelectItem>
                    <SelectItem value="auth0">Auth0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="provider-enabled"
                  checked={(editingProvider || newProvider).enabled || false}
                  onCheckedChange={(checked) => {
                    const target = editingProvider || newProvider;
                    if (editingProvider) {
                      setEditingProvider({ ...target, enabled: checked });
                    } else {
                      setNewProvider({ ...target, enabled: checked });
                    }
                  }}
                />
                <Label htmlFor="provider-enabled" className="cursor-pointer">
                  Enable this provider
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="configuration" className="space-y-4">
              {renderProviderForm(editingProvider || newProvider)}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-role">Default Role</Label>
                <Select
                  value={(editingProvider || newProvider).configuration?.defaultRole || 'member'}
                  onValueChange={(value) => {
                    const target = editingProvider || newProvider;
                    const updated = {
                      ...target,
                      configuration: { ...target.configuration, defaultRole: value }
                    };
                    if (editingProvider) {
                      setEditingProvider(updated);
                    } else {
                      setNewProvider(updated);
                    }
                  }}
                >
                  <SelectTrigger id="default-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-provision"
                  checked={(editingProvider || newProvider).configuration?.autoProvision || false}
                  onCheckedChange={(checked) => {
                    const target = editingProvider || newProvider;
                    const updated = {
                      ...target,
                      configuration: { ...target.configuration, autoProvision: checked }
                    };
                    if (editingProvider) {
                      setEditingProvider(updated);
                    } else {
                      setNewProvider(updated);
                    }
                  }}
                />
                <Label htmlFor="auto-provision" className="cursor-pointer">
                  Auto-provision new users
                </Label>
              </div>

              {(editingProvider || newProvider).type === 'saml' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="idp-initiated"
                    checked={(editingProvider || newProvider).configuration?.allowIdpInitiated || false}
                    onCheckedChange={(checked) => {
                      const target = editingProvider || newProvider;
                      const updated = {
                        ...target,
                        configuration: { ...target.configuration, allowIdpInitiated: checked }
                      };
                      if (editingProvider) {
                        setEditingProvider(updated);
                      } else {
                        setNewProvider(updated);
                      }
                    }}
                  />
                  <Label htmlFor="idp-initiated" className="cursor-pointer">
                    Allow IdP-initiated SSO
                  </Label>
                </div>
              )}

              <div className="space-y-2">
                <Label>Attribute Mapping</Label>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="IdP attribute"
                      value={(editingProvider || newProvider).configuration?.attributeMapping?.email || 'email'}
                      disabled
                    />
                    <Input value="email" disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="IdP attribute"
                      value={(editingProvider || newProvider).configuration?.attributeMapping?.firstName || 'firstName'}
                      onChange={(e) => {
                        const target = editingProvider || newProvider;
                        const updated = {
                          ...target,
                          configuration: {
                            ...target.configuration,
                            attributeMapping: {
                              ...target.configuration?.attributeMapping,
                              firstName: e.target.value
                            }
                          }
                        };
                        if (editingProvider) {
                          setEditingProvider(updated);
                        } else {
                          setNewProvider(updated);
                        }
                      }}
                    />
                    <Input value="firstName" disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="IdP attribute"
                      value={(editingProvider || newProvider).configuration?.attributeMapping?.lastName || 'lastName'}
                      onChange={(e) => {
                        const target = editingProvider || newProvider;
                        const updated = {
                          ...target,
                          configuration: {
                            ...target.configuration,
                            attributeMapping: {
                              ...target.configuration?.attributeMapping,
                              lastName: e.target.value
                            }
                          }
                        };
                        if (editingProvider) {
                          setEditingProvider(updated);
                        } else {
                          setNewProvider(updated);
                        }
                      }}
                    />
                    <Input value="lastName" disabled />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingProvider(false);
                setEditingProvider(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProvider}>
              {editingProvider ? 'Update Provider' : 'Add Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
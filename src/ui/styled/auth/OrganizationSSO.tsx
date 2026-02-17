'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useOrgSsoConfig } from '@/hooks/sso/useOrgSsoConfig';
import BusinessSSOSetup from './BusinessSSOSetup';
import IDPConfiguration from './IDPConfiguration';

interface OrganizationSSOProps {
  orgId: string;
}

interface SSOStatus {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastSuccessfulLogin: string | null;
  lastError: string | null;
  totalSuccessfulLogins24h: number;
}

const OrganizationSSO: React.FC<OrganizationSSOProps> = ({ orgId }) => {
  const { t } = useTranslation();
  const [ssoSettings, setSsoSettings] = useState<{
    sso_enabled: boolean;
    idp_type: 'saml' | 'oidc' | null;
  }>({
    sso_enabled: false,
    idp_type: null,
  });

  const [ssoStatus, setSsoStatus] = useState<SSOStatus>({
    status: 'unknown',
    lastSuccessfulLogin: null,
    lastError: null,
    totalSuccessfulLogins24h: 0
  });

  const {
    getSettings,
    getStatus,
  } = useOrgSsoConfig(orgId);

  // Fetch initial SSO settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        setSsoSettings(data);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch SSO settings:', error);
        }
      }
    };
    fetchSettings();
  }, [orgId, getSettings]);

  // Fetch SSO status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getStatus();
        setSsoStatus(data);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') { console.error('Failed to fetch SSO status:', error) }
      }
    };

    // Initial fetch
    if (ssoSettings.sso_enabled) {
      fetchStatus();
    }

    // Set up polling every 5 minutes if SSO is enabled
    let interval: NodeJS.Timeout;
    if (ssoSettings.sso_enabled) {
      interval = setInterval(fetchStatus, 5 * 60 * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [orgId, ssoSettings.sso_enabled]);

  const handleSettingsChange = (settings: {
    sso_enabled: boolean;
    idp_type: 'saml' | 'oidc' | null;
  }) => {
    setSsoSettings(settings);
  };

  const getStatusIcon = () => {
    switch (ssoStatus.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (ssoStatus.status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* SSO Status Indicator */}
      {ssoSettings.sso_enabled && (
        <div className={`rounded-lg border p-4 ${getStatusColor()}`} data-testid="sso-status-indicator">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className="font-medium">
                  {t(`org.sso.status.${ssoStatus.status}`)}
                </h3>
                <p className="text-sm">
                  {ssoStatus.lastSuccessfulLogin
                    ? t('org.sso.status.lastLogin', { time: new Date(ssoStatus.lastSuccessfulLogin).toLocaleString() })
                    : t('org.sso.status.noLogins')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {t('org.sso.status.24hLogins', { count: ssoStatus.totalSuccessfulLogins24h })}
              </p>
              {ssoStatus.lastError && (
                <p className="text-sm mt-1 text-red-600">
                  {t('org.sso.status.lastError')}: {ssoStatus.lastError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <BusinessSSOSetup 
        organizationId={orgId} 
      />

      {ssoSettings.sso_enabled && ssoSettings.idp_type && (
        <IDPConfiguration
          orgId={orgId}
          idpType={ssoSettings.idp_type}
          onConfigurationUpdate={() => {
            // You could add additional handling here if needed
            // For example, showing a global notification
          }}
        />
      )}

      {/* Optional: Add help text or documentation links */}
      {ssoSettings.sso_enabled && ssoSettings.idp_type && (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-2">
            {t('org.sso.helpTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {ssoSettings.idp_type === 'saml' 
              ? t('org.sso.samlHelpText')
              : t('org.sso.oidcHelpText')
            }
          </p>
          <ul className="list-disc list-inside text-sm space-y-2">
            {ssoSettings.idp_type === 'saml' ? (
              <>
                <li>{t('org.sso.saml.helpStep1')}</li>
                <li>{t('org.sso.saml.helpStep2')}</li>
                <li>{t('org.sso.saml.helpStep3')}</li>
                <li>{t('org.sso.saml.helpStep4')}</li>
              </>
            ) : (
              <>
                <li>{t('org.sso.oidc.helpStep1')}</li>
                <li>{t('org.sso.oidc.helpStep2')}</li>
                <li>{t('org.sso.oidc.helpStep3')}</li>
                <li>{t('org.sso.oidc.helpStep4')}</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OrganizationSSO; 
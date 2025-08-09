'use client'; // This component uses context and hooks, so it must be a Client Component

import React, { createContext, useContext, ReactNode, useEffect, useMemo } from 'react';
import { api } from '@/lib/api/axios';
import { ThemeProvider } from '@/ui/primitives/theme-provider';
// import { Toaster } from '@/ui/primitives/toaster'; // Comment out unused import
// Avoid importing axios directly in provider; use fetch in consumer code or server routes
// import { useAuth } from '@/hooks/auth/useAuth'; // Commented out
import { 
  /* initializeNotifications, */ // Keep type imports, comment out function if problematic
  type NotificationConfig, 
  type Platform 
} from '@/lib/services/notification.service';
import { TwoFactorProviderConfig } from '@/types/2fa';
import { SubscriptionProviderConfig, SubscriptionTier } from '@/types/subscription';
import { CorporateUserConfig, UserType } from '@/types/user-type';
import { OAuthModuleConfig } from '@/types/oauth';
// import { initializeCsrf } from '@/lib/api/axios'; // Removed unused import
// import { LoginPayload, AuthResult } from '@/core/auth/models'; // Commented out
import { PaletteProvider } from '@/ui/primitives/PaletteProvider';
import { initializeNotifications } from '../services/notification.service';
import { notificationPreferencesService } from '../services/notification-preferences.service';

// Detect platform automatically (can be overridden in config)
const detectPlatform = (): Platform => {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'react-native';
  }
  
  if (typeof window !== 'undefined' && window.navigator && window.navigator.userAgent) {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    }
    if (/android/.test(userAgent)) {
      return 'android';
    }
  }
  
  return 'web';
};

// Types for config and callbacks
export interface IntegrationCallbacks {
  onUserLogin?: (user: any) => void;
  onUserLogout?: () => void;
  onProfileUpdate?: (profile: any) => void;
  onError?: (error: any) => void;
}

export interface LayoutOptions {
  useCustomHeader?: boolean;
  headerComponent?: React.ReactNode;
  useCustomFooter?: boolean;
  footerComponent?: React.ReactNode;
  useCustomLayout?: boolean;
  layoutComponent?: React.ComponentType<{ children: ReactNode }>;
}

export interface PlatformUIComponents {
  // Alternative components for different platforms
  Button?: React.ComponentType<any>;
  Input?: React.ComponentType<any>;
  Select?: React.ComponentType<any>;
  Switch?: React.ComponentType<any>;
  Card?: React.ComponentType<any>;
  // Navigation components for mobile
  TabNavigator?: React.ComponentType<any>;
  StackNavigator?: React.ComponentType<any>;
}

export interface MobileConfig {
  // Mobile-specific options
  useNativeStorage?: boolean;
  statusBarConfig?: {
    style?: 'default' | 'light-content' | 'dark-content';
    backgroundColor?: string;
  };
  screenOptions?: Record<string, any>;
  safeAreaInsets?: {
    top?: boolean | number;
    bottom?: boolean | number;
    left?: boolean | number;
    right?: boolean | number;
  };
}

export interface UserManagementConfig {
  apiBaseUrl?: string;
  callbacks?: IntegrationCallbacks;
  layout?: LayoutOptions;
  i18nNamespace?: string;
  storageKeyPrefix?: string;
  notifications?: NotificationConfig;
  platform?: Platform;
  isNative?: boolean; // Flag to indicate if running in a native mobile container
  ui?: PlatformUIComponents; // Platform-specific UI components
  mobileConfig?: MobileConfig; // Mobile-specific configuration
  twoFactor?: TwoFactorProviderConfig;
  subscription?: SubscriptionProviderConfig;
  corporateUsers?: CorporateUserConfig;
  oauth?: OAuthModuleConfig;
}

// Create a context for accessing configuration
export interface UserManagementContextValue {
  config: UserManagementConfig;
  callbacks: Required<IntegrationCallbacks>;
  layout: Required<LayoutOptions>;
  platform: Platform;
  isNative: boolean;
  ui: PlatformUIComponents;
  api: any;
  storageKeyPrefix: string;
  i18nNamespace: string;
  twoFactor: TwoFactorProviderConfig;
  subscription: SubscriptionProviderConfig;
  corporateUsers: CorporateUserConfig;
  oauth: OAuthModuleConfig;
}

const defaultCallbacks: Required<IntegrationCallbacks> = {
  onUserLogin: () => {},
  onUserLogout: () => {},
  onProfileUpdate: () => {},
  onError: () => {},
};

const defaultLayout: Required<LayoutOptions> = {
  useCustomHeader: false,
  headerComponent: null,
  useCustomFooter: false,
  footerComponent: null,
  useCustomLayout: false,
  layoutComponent: ({ children }) => <>{children}</>,
};

const UserManagementContext = createContext<UserManagementContextValue>({
  config: {},
  callbacks: defaultCallbacks,
  layout: defaultLayout,
  platform: 'web',
  isNative: false,
  ui: {},
  api: api,
  storageKeyPrefix: 'user',
  i18nNamespace: 'userManagement',
  twoFactor: {
    enabled: false,
    methods: [],
    required: false,
  },
  subscription: {
    enabled: false,
    defaultTier: SubscriptionTier.FREE,
    features: {},
    enableBilling: false,
  },
  corporateUsers: {
    enabled: true,
    registrationEnabled: true,
    requireCompanyValidation: false,
    allowUserTypeChange: false,
    companyFieldsRequired: ['name'],
    defaultUserType: UserType.PRIVATE,
  },
  oauth: {
    enabled: false,
    providers: [],
    autoLink: true,
    allowUnverifiedEmails: false,
    defaultRedirectPath: '/',
  },
});

// Hook for accessing the user management context
export const useUserManagement = () => {
  const ctx = useContext(UserManagementContext);
  console.log('[PROVIDER_DEBUG] useUserManagement called. Context value:', ctx);
  return ctx;
};

// Platform-specific component helper
export const PlatformComponent = ({ 
  web, 
  mobile,
  component,
  ...props 
}: { 
  web?: React.ReactNode; 
  mobile?: React.ReactNode;
  component?: string;
  [key: string]: any; 
}) => {
  // const { platform, isNative, ui } = useUserManagement(); // Comment out unused platform
  const { isNative, ui } = useUserManagement(); 
  
  if (isNative && mobile) {
    return <>{mobile}</>;
  }
  
  if (component && ui[component as keyof PlatformUIComponents]) {
    const Component = ui[component as keyof PlatformUIComponents] as React.ComponentType<any>;
    return <Component {...props} />;
  }
  
  return <>{web}</>;
};

// Initialize API with custom base URL if provided
const initializeApi = (baseUrl?: string) => {
  if (baseUrl) {
    api.defaults.baseURL = baseUrl;
  }
};

interface UserManagementProviderProps {
  children?: ReactNode;
  config?: UserManagementConfig;
}

export function UserManagementProvider({
  children,
  config = {},
}: UserManagementProviderProps) {
  console.log('[PROVIDER_DEBUG] UserManagementProvider received config:', config);
  const detectedPlatform = config.platform || detectPlatform();
  console.log('[PROVIDER_DEBUG] Platform detected:', detectedPlatform);
  const isNative = config.isNative || detectedPlatform !== 'web';

  // Initialize API effect
  useEffect(() => {
    console.log("[PROVIDER_DEBUG] useEffect - initializeApi");
    initializeApi(config.apiBaseUrl);
  }, [config.apiBaseUrl]);

  // Initialize notifications effect
  useEffect(() => {
    console.log("[PROVIDER_DEBUG] useEffect - initializeNotifications");
    if (config.notifications) {
      const notificationConfig = {
        ...config.notifications,
        platform: detectedPlatform,
        enabled: true
      };
      initializeNotifications(notificationConfig);
      
      // Initialize notification preferences
      notificationPreferencesService.initializeFromStore()
        .catch(error => console.error("Failed to initialize notification preferences:", error));
    }
  }, [config.notifications, detectedPlatform]);

  // --- Temporarily disable AuthStore interaction --- 
  /*
  let authStore;
  try {
    authStore = useAuth();
    console.log("[PROVIDER_DEBUG] useAuth() successful");
  } catch (e) {
    console.error("[PROVIDER_DEBUG] useAuth() FAILED:", e);
    throw e; // Re-throw to see error in tests if this fails
  }

  React.useEffect(() => {
    console.log("[PROVIDER_DEBUG] useEffect - auth callbacks setup START");
    const originalLogin = authStore.login;
    const originalLogout = authStore.logout;

    const newLogin = async (payload: LoginPayload): Promise<AuthResult> => {
      let result: AuthResult = { success: false, error: 'Login failed unexpectedly.' };
      try {
        result = await originalLogin(payload);
        
        if (result.success && authStore.user) {
          config.callbacks?.onUserLogin?.(authStore.user);
        }
        if (!result.success) {
          config.callbacks?.onError?.(result.error || 'Unknown login error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during login.';
        config.callbacks?.onError?.(errorMessage);
        result = { success: false, error: errorMessage }; 
      }
      return result; 
    };

    const newLogout = async (): Promise<void> => {
      try {
        await originalLogout();
        config.callbacks?.onUserLogout?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during logout.';
        config.callbacks?.onError?.(errorMessage);
      }
    };

    authStore.login = newLogin;
    authStore.logout = newLogout;

    return () => {
      authStore.login = originalLogin;
      authStore.logout = originalLogout;
      console.log("[PROVIDER_DEBUG] useEffect - auth callbacks CLEANUP");
    };
  }, [authStore, config.callbacks]); // Dependencies commented out
  */
  // --- End temporary disable --- 

  // Create context value
  const value = useMemo(() => {
    console.log('[PROVIDER_DEBUG] useMemo - calculating context value START');
    const mergedConfig = {
      ...config,
      platform: detectedPlatform,
      isNative,
      ui: config.ui || {},
      api: api,
      storageKeyPrefix: config.storageKeyPrefix || 'user',
      i18nNamespace: config.i18nNamespace || 'userManagement',
      twoFactor: config.twoFactor || {
        enabled: false,
        methods: [],
        required: false,
      },
      subscription: config.subscription || {
        enabled: false,
        defaultTier: SubscriptionTier.FREE,
        features: {},
        enableBilling: false,
      },
      corporateUsers: config.corporateUsers || {
        enabled: true,
        registrationEnabled: true,
        requireCompanyValidation: false,
        allowUserTypeChange: false,
        companyFieldsRequired: ['name'],
        defaultUserType: UserType.PRIVATE,
      },
      oauth: config.oauth || {
        enabled: false,
        providers: [],
        autoLink: true,
        allowUnverifiedEmails: false,
        defaultRedirectPath: '/',
      },
    };
    console.log('[PROVIDER_DEBUG] mergedConfig:', mergedConfig);
    const finalCallbacks = { ...defaultCallbacks, ...config.callbacks };
    const finalLayout = { ...defaultLayout, ...config.layout };
    console.log("[PROVIDER_DEBUG] useMemo - calculating context value END");
    return {
      config: mergedConfig,
      callbacks: finalCallbacks,
      layout: finalLayout,
      isNative,
      ui: config.ui || {},
      api: api,
      storageKeyPrefix: config.storageKeyPrefix || 'user',
      i18nNamespace: config.i18nNamespace || 'userManagement',
      twoFactor: config.twoFactor || {
        enabled: false,
        methods: [],
        required: false,
      },
      subscription: config.subscription || {
        enabled: false,
        defaultTier: SubscriptionTier.FREE,
        features: {},
        enableBilling: false,
      },
      corporateUsers: config.corporateUsers || {
        enabled: true,
        registrationEnabled: true,
        requireCompanyValidation: false,
        allowUserTypeChange: false,
        companyFieldsRequired: ['name'],
        defaultUserType: UserType.PRIVATE,
      },
      oauth: config.oauth || {
        enabled: false,
        providers: [],
        autoLink: true,
        allowUnverifiedEmails: false,
        defaultRedirectPath: '/',
      },
      platform: detectedPlatform,
    };
  }, [config, detectedPlatform, isNative]); // Temporarily remove authStore dependency

  console.log("[PROVIDER_DEBUG] UserManagementProvider BEFORE RETURN");

  // const renderToaster = !isNative || detectedPlatform === 'react-native'; // Comment out unused var

  // Apply mobile configuration if needed
  if (isNative && config.mobileConfig?.statusBarConfig && typeof document !== 'undefined') {
    document.documentElement.style.setProperty(
      '--status-bar-height', 
      `${config.mobileConfig.statusBarConfig ? '20px' : '0px'}`
    );
  }

  return (
    <UserManagementContext.Provider value={value}>
      <PaletteProvider>
        <ThemeProvider defaultTheme="light" storageKey={`${config.storageKeyPrefix || 'user-management'}-theme`}>
          {children}
          {/* {renderToaster && <Toaster />} */}{/* Keep Toaster commented out */}
        </ThemeProvider>
      </PaletteProvider>
    </UserManagementContext.Provider>
  );
} 
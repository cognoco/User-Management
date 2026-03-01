import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as UserManagementProvider from '@/lib/auth/UserManagementProvider';

import { CorporateProfileSection } from '../CorporateProfileSection';
import { UserType, Company } from '@/types/user-type';
import type { UserManagementContextValue } from '@/lib/auth/UserManagementProvider';

import { Platform } from '@/lib/services/notification.service';
import { SubscriptionTier } from '@/types/subscription';

const mockOnUpdate = vi.fn();

const initialCompanyData: Company = {
  name: 'Acme Corp',
  industry: 'Widgets',
  website: 'https://acme.com',
  position: 'CEO',
  department: 'Management',
  vatId: 'GB123456789',
  size: '51-200',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    postalCode: '90210',
    country: 'USA',
  },
};

const defaultUserManagementContext: UserManagementContextValue = {
  config: {},
  callbacks: {
    onUserLogin: () => {},
    onUserLogout: () => {},
    onProfileUpdate: () => {},
    onError: () => {},
  },
  layout: {
    useCustomHeader: false,
    headerComponent: null,
    useCustomFooter: false,
    footerComponent: null,
    useCustomLayout: false,
    layoutComponent: Object.assign(
      ({ children }: { children: React.ReactNode }) => <>{children}</>,
      { displayName: 'MockLayoutComponent' }
    ),
  },
  platform: 'web' as Platform,
  isNative: false,
  ui: {},
  api: {} as any, // Adjust as needed for actual API structure
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
};

vi.mock('@/ui/primitives/button', () => ({ Button: (props: any) => <button {...props} /> }));
vi.mock('@/ui/primitives/input', () => {
    const MockInput = React.forwardRef((props: any, ref: any) => <input ref={ref} {...props} />);
    MockInput.displayName = 'MockInput';
    return { Input: MockInput };
});
vi.mock('@/ui/primitives/label', () => ({ Label: (props: any) => <label {...props} /> }));
vi.mock('@/ui/primitives/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/ui/primitives/separator', () => ({ Separator: () => <hr /> }));
vi.mock('@/ui/primitives/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock('../CompanyLogoUpload', () => {
    const MockedCompanyLogoUpload = () => <div data-testid="company-logo-upload">Logo Upload</div>;
    MockedCompanyLogoUpload.displayName = 'MockedCompanyLogoUpload';
    return { CompanyLogoUpload: MockedCompanyLogoUpload };
});

describe('CorporateProfileSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(UserManagementProvider, 'useUserManagement').mockReturnValue({
      ...defaultUserManagementContext,
      corporateUsers: {
        ...defaultUserManagementContext.corporateUsers,
        enabled: true,
      },
    } as UserManagementContextValue);
  });

  it('should render nothing if corporate users are disabled', async () => {
    vi.spyOn(UserManagementProvider, 'useUserManagement').mockReturnValue({
      ...defaultUserManagementContext,
      corporateUsers: {
        ...defaultUserManagementContext.corporateUsers,
        enabled: false,
      },
    } as UserManagementContextValue);
    let container: HTMLElement | undefined;
    await act(async () => {
      const result = render(
        <MemoryRouter>
          <CorporateProfileSection 
            userType={UserType.CORPORATE} 
            company={initialCompanyData} 
            onUpdate={mockOnUpdate} 
          />
        </MemoryRouter>
      );
      container = result.container;
    });
    expect(container?.firstChild).toBeNull();
  });

  it('should render nothing if user type is not corporate', async () => {
    let container: HTMLElement | undefined;
    await act(async () => {
      const result = render(
        <MemoryRouter>
          <CorporateProfileSection 
            userType={UserType.PRIVATE} // Pass PRIVATE type
            company={initialCompanyData} 
            onUpdate={mockOnUpdate} 
          />
        </MemoryRouter>
      );
      container = result.container;
    });
    expect(container?.firstChild).toBeNull();
  });

  it('should render the form with initial company data', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <CorporateProfileSection 
            userType={UserType.CORPORATE} 
            company={initialCompanyData} 
            onUpdate={mockOnUpdate} 
          />
        </MemoryRouter>
      );
    });

    expect(screen.getByLabelText(/companyName/i)).toHaveValue(initialCompanyData.name);
    expect(screen.getByLabelText(/industry/i)).toHaveValue(initialCompanyData.industry);
    expect(screen.getByLabelText(/companySize/i)).toHaveValue(initialCompanyData.size);
    expect(screen.getByLabelText(/website/i)).toHaveValue(initialCompanyData.website);
    expect(screen.getByLabelText(/vatId/i)).toHaveValue(initialCompanyData.vatId);
    expect(screen.getByLabelText(/position/i)).toHaveValue(initialCompanyData.position);
    expect(screen.getByLabelText(/department/i)).toHaveValue(initialCompanyData.department);
    expect(screen.getByLabelText(/street/i)).toHaveValue(initialCompanyData.address?.street);
    expect(screen.getByLabelText(/city/i)).toHaveValue(initialCompanyData.address?.city);
    expect(screen.getByLabelText(/state/i)).toHaveValue(initialCompanyData.address?.state);
    expect(screen.getByLabelText(/postalCode/i)).toHaveValue(initialCompanyData.address?.postalCode);
    expect(screen.getByLabelText(/country/i)).toHaveValue(initialCompanyData.address?.country);

    expect(screen.getByTestId('company-logo-upload')).toBeInTheDocument();
  });

  it('should call onUpdate with updated data on form submission', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <MemoryRouter>
          <CorporateProfileSection 
            userType={UserType.CORPORATE} 
            company={initialCompanyData} 
            onUpdate={mockOnUpdate} 
          />
        </MemoryRouter>
      );
    });

    const newCompanyName = 'New Acme Inc.';
    const newIndustry = 'Software';
    const newStreet = '456 Side St';

    await act(async () => {
      await user.clear(screen.getByLabelText(/companyName/i));
      await user.type(screen.getByLabelText(/companyName/i), newCompanyName);
      await user.clear(screen.getByLabelText(/industry/i));
      await user.type(screen.getByLabelText(/industry/i), newIndustry);
      await user.clear(screen.getByLabelText(/street/i));
      await user.type(screen.getByLabelText(/street/i), newStreet);
      await user.click(screen.getByRole('button', { name: /save/i }));
    });

    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    // Check that the payload matches the updated fields
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      name: newCompanyName,
      industry: newIndustry,
      address: expect.objectContaining({
          street: newStreet,
          city: initialCompanyData.address?.city, // Other fields remain the same
      }),
      // Ensure other initial fields are still present
      website: initialCompanyData.website,
      position: initialCompanyData.position,
      size: initialCompanyData.size, 
    }));
  });

  it('should call onUpdate with address as undefined if all address fields are cleared', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <MemoryRouter>
          <CorporateProfileSection 
            userType={UserType.CORPORATE} 
            company={initialCompanyData} // Start with address data
            onUpdate={mockOnUpdate} 
          />
        </MemoryRouter>
      );
    });

    await act(async () => {
      await user.clear(screen.getByLabelText(/street/i));
      await user.clear(screen.getByLabelText(/city/i));
      await user.clear(screen.getByLabelText(/state/i));
      await user.clear(screen.getByLabelText(/postalCode/i));
      await user.clear(screen.getByLabelText(/country/i));
  
      await user.click(screen.getByRole('button', { name: /save/i }));
    });

    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    // Check that the payload has address: undefined
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      name: initialCompanyData.name,
      address: undefined, // Address should be undefined now
    }));
  });
  
  // TODO: Add test for error prop rendering
  // TODO: Add test for isLoading prop disabling the button

}); 

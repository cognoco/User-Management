import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '@/hooks/auth/useAuth';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }))
}));

// Use robust mock for useAuth
vi.mock('@/hooks/auth/useAuth', () => {
  // Move setupZustandSelectorMock inside the factory
  function setupZustandSelectorMock(store: unknown) {
    return (selector: unknown) => (typeof selector === 'function' ? selector(store) : store);
  }
  const mockStore = {
    isAuthenticated: false,
    user: null,
    isLoading: false
  };
  // Create a mock function that supports selectors
  const useAuthMock: unknown = vi.fn(setupZustandSelectorMock(mockStore));
  // Add setState method to update the mock store
  useAuthMock.setState = (newState: unknown) => {
    Object.assign(mockStore, newState);
  };
  return { useAuth: useAuthMock };
});

// Setup RBAC store with selector support
vi.mock('@/lib/stores/rbac.store', () => {
  // Move setupZustandSelectorMock inside the factory
  function setupZustandSelectorMock(store: unknown) {
    return (selector: any) => (typeof selector === 'function' ? selector(store) : store);
  }
  // Move the mock state and spies inside the factory
  const rbacStoreMock = {
    isLoading: false,
    hasRole: vi.fn(() => false),
    hasPermission: vi.fn(() => false),
    fetchUserRoles: vi.fn(async () => {}),
    roles: [],
    userRoles: []
  };
  // Export via global for test access
  (global as any).__rbacStoreMock = rbacStoreMock;
  const useRBACStoreMock: any = vi.fn(setupZustandSelectorMock(rbacStoreMock));
  useRBACStoreMock.setState = (newState: any) => {
    Object.assign(rbacStoreMock, newState);
  };
  return { useRBACStore: useRBACStoreMock };
});

describe('ProtectedRoute', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  };

  const MockComponent = () => <div>Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockImplementation(() => mockRouter);
    
    // Reset auth hook state
    useAuth.setState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
    
    // Reset RBAC store state
    const rbacStoreMock = (global as any).__rbacStoreMock;
    Object.assign(rbacStoreMock, {
      isLoading: false,
      hasRole: vi.fn(() => false),
      hasPermission: vi.fn(() => false),
      fetchUserRoles: vi.fn(async (userId: string) => {
        rbacStoreMock.isLoading = true;
        await new Promise(res => setTimeout(res, 0));
        if (userId) {
          rbacStoreMock.userRoles = [
            { userId, roleId: 'admin' },
            { userId, roleId: 'editor' }
          ];
        }
        rbacStoreMock.isLoading = false;
      }),
      roles: [],
      userRoles: []
    });
  });

  it('should show loading state when authentication is being checked', async () => {
    useAuth.setState({ isAuthenticated: false, user: null, isLoading: true });
    const rbacStoreMock = (global as any).__rbacStoreMock;
    rbacStoreMock.isLoading = false;
    
    await act(async () => {
      render(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );
    });

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    useAuth.setState({ isAuthenticated: false, user: null, isLoading: false });
    const rbacStoreMock = (global as any).__rbacStoreMock;
    rbacStoreMock.isLoading = false;
    
    await act(async () => {
      render(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', async () => {
    useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
    const rbacStoreMock = (global as any).__rbacStoreMock;
    rbacStoreMock.isLoading = false;
    
    // Explicitly simulate fetchUserRoles effect
    await act(async () => {
      // Call with userId argument
      await rbacStoreMock.fetchUserRoles('1');
      render(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );
    });
    
    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should handle custom redirect paths', async () => {
    useAuth.setState({ isAuthenticated: false, user: null, isLoading: false });
    const rbacStoreMock = (global as any).__rbacStoreMock;
    rbacStoreMock.isLoading = false;
    
    // Explicitly simulate fetchUserRoles effect
    await act(async () => {
      render(
        <ProtectedRoute redirectPath="/custom/login">
          <MockComponent />
        </ProtectedRoute>
      );
    });
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/custom/login');
    });
  });

  describe('Role-based access control', () => {
    it('should allow access when user has required role', async () => {
      useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
      
      // Simulate roles and userRoles
      const rbacStoreMock = (global as any).__rbacStoreMock;
      Object.assign(rbacStoreMock, {
        roles: [{ id: 'admin', name: 'admin', permissions: [] }],
        userRoles: [{ userId: '1', roleId: 'admin' }],
        hasRole: vi.fn((role) => role === 'admin'),
        isLoading: false
      });
      
      // Explicitly simulate fetchUserRoles effect
      await act(async () => {
        render(
          <ProtectedRoute requiredRoles={['admin']}>
            <MockComponent />
          </ProtectedRoute>
        );
      });
      
      await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should deny access when user lacks required role', async () => {
      useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
      
      // Simulate roles and userRoles
      const rbacStoreMock = (global as any).__rbacStoreMock;
      Object.assign(rbacStoreMock, {
        roles: [{ id: 'admin', name: 'admin', permissions: [] }],
        userRoles: [{ userId: '1', roleId: 'user' }],
        hasRole: vi.fn(() => false),
        isLoading: false
      });
      
      // Explicitly simulate fetchUserRoles effect
      await act(async () => {
        render(
          <ProtectedRoute requiredRoles={['admin']}>
            <MockComponent />
          </ProtectedRoute>
        );
      });
      
      await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should handle multiple required roles', async () => {
      useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
      
      // Simulate roles and userRoles
      const rbacStoreMock = (global as any).__rbacStoreMock;
      Object.assign(rbacStoreMock, {
        roles: [
          { id: 'editor', name: 'editor', permissions: [] },
          { id: 'user', name: 'user', permissions: [] }
        ],
        userRoles: [
          { userId: '1', roleId: 'editor' },
          { userId: '1', roleId: 'user' }
        ],
        hasRole: vi.fn((role) => role === 'user' || role === 'editor'),
        isLoading: false
      });
      
      // Explicitly simulate fetchUserRoles effect
      await act(async () => {
        render(
          <ProtectedRoute requiredRoles={['editor', 'user']}>
            <MockComponent />
          </ProtectedRoute>
        );
      });
      
      await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should handle custom access denied component', async () => {
      useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
      
      // Simulate roles and userRoles
      const rbacStoreMock = (global as any).__rbacStoreMock;
      Object.assign(rbacStoreMock, {
        roles: [{ id: 'admin', name: 'admin', permissions: [] }],
        userRoles: [{ userId: '1', roleId: 'user' }],
        hasRole: vi.fn(() => false),
        isLoading: false
      });
      
      const CustomDenied = () => <div>Custom Access Denied</div>;
      
      // Explicitly simulate fetchUserRoles effect
      await act(async () => {
        render(
          <ProtectedRoute 
            requiredRoles={['admin']} 
            accessDeniedComponent={<CustomDenied />}
          >
            <MockComponent />
          </ProtectedRoute>
        );
      });
      
      await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
      expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Permission-based access control', () => {
    it('should allow access when user has required permission', async () => {
      useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
      
      // Simulate roles and userRoles
      const rbacStoreMock = (global as any).__rbacStoreMock;
      Object.assign(rbacStoreMock, {
        roles: [{ id: 'admin', name: 'admin', permissions: ['create:post'] }],
        userRoles: [{ userId: '1', roleId: 'admin' }],
        hasPermission: vi.fn((permission) => permission === 'create:post'),
        isLoading: false
      });
      
      // Explicitly simulate fetchUserRoles effect
      await act(async () => {
        render(
          <ProtectedRoute requiredPermissions={['create:post']}>
            <MockComponent />
          </ProtectedRoute>
        );
      });
      
      await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should deny access when user lacks required permission', async () => {
      useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
      
      // Simulate roles and userRoles
      const rbacStoreMock = (global as any).__rbacStoreMock;
      Object.assign(rbacStoreMock, {
        roles: [{ id: 'admin', name: 'admin', permissions: ['create:post'] }],
        userRoles: [{ userId: '1', roleId: 'admin' }],
        hasPermission: vi.fn(() => false),
        isLoading: false
      });
      
      // Explicitly simulate fetchUserRoles effect
      await act(async () => {
        render(
          <ProtectedRoute requiredPermissions={['create:post']}>
            <MockComponent />
          </ProtectedRoute>
        );
      });
      
      await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should handle multiple required permissions', async () => {
      useAuth.setState({ isAuthenticated: true, user: { id: '1', email: 'test@example.com' }, isLoading: false });
      
      // Simulate roles and userRoles
      const rbacStoreMock = (global as any).__rbacStoreMock;
      Object.assign(rbacStoreMock, {
        roles: [
          { id: 'admin', name: 'admin', permissions: ['read:post', 'create:post'] }
        ],
        userRoles: [{ userId: '1', roleId: 'admin' }],
        hasPermission: vi.fn((permission) => permission === 'read:post' || permission === 'create:post'),
        isLoading: false
      });
      
      // Explicitly simulate fetchUserRoles effect
      await act(async () => {
        render(
          <ProtectedRoute requiredPermissions={['read:post', 'create:post']}>
            <MockComponent />
          </ProtectedRoute>
        );
      });
      
      await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
}); 
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import RoleManagementPanel from '../RoleManagementPanel';
import { useRBACStore } from '@/lib/stores/rbac.store';
import { User } from '@/types/user';
import { RoleSchema, UserRoleSchema, RoleValues, PermissionValues } from '@/types/rbac';
import { createRBACStoreMock } from '@/tests/mocks/rbac.store.mock';

vi.mock('@/lib/stores/rbac.store');

const mockUsers: User[] = [
  { id: '1', email: 'admin@example.com', fullName: 'Admin User' } as User,
  { id: '2', email: 'user@example.com', fullName: 'Regular User' } as User,
];

const mockRoles: RoleSchema[] = [
  {
    id: 'r1',
    name: RoleValues.ADMIN,
    description: 'Admin role',
    permissions: [PermissionValues.MANAGE_ROLES, PermissionValues.ADMIN_ACCESS],
  },
  {
    id: 'r2',
    name: RoleValues.USER,
    description: 'User role',
    permissions: [PermissionValues.VIEW_ANALYTICS],
  },
];

const mockUserRoles: UserRoleSchema[] = [
  { id: 'ur1', userId: '1', roleId: 'r1', assignedBy: 'system', createdAt: '', expiresAt: undefined },
  { id: 'ur2', userId: '2', roleId: 'r2', assignedBy: 'system', createdAt: '', expiresAt: undefined },
];

// Patch for Zustand selector compatibility in React 19+
function setupRBACStoreMock(rbacMock: any) {
  // useRBACStore is a function that takes a selector and returns selector(state)
  (useRBACStore as any).mockImplementation((selector: any) =>
    selector(rbacMock.getState())
  );
}

describe('RoleManagementPanel', () => {
  let rbacMock: ReturnType<typeof createRBACStoreMock>;
  beforeEach(() => {
    vi.clearAllMocks();
    rbacMock = createRBACStoreMock({
      roles: mockRoles,
      userRoles: mockUserRoles,
      isLoading: false,
      error: null,
      assignRole: vi.fn(),
      removeRole: vi.fn(),
    });
    setupRBACStoreMock(rbacMock);
  });

  it('renders the panel and user/role list', () => {
    render(<RoleManagementPanel users={mockUsers} />);
    expect(screen.getByText('User Role Management')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Regular User')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 users
    expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/user/i).length).toBeGreaterThan(0);
  });

  it('assigns a role to a user', async () => {
    const assignRole = vi.fn();
    rbacMock = createRBACStoreMock({
      roles: mockRoles,
      userRoles: mockUserRoles,
      isLoading: false,
      error: null,
      assignRole,
      removeRole: vi.fn(),
    });
    setupRBACStoreMock(rbacMock);
    render(<RoleManagementPanel users={mockUsers} />);
    // For user 2, only 'admin' is assignable
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);
    await act(async () => {
      await userEvent.selectOptions(selects[1], 'r1');
    });
    await waitFor(() => {
      expect(assignRole).toHaveBeenCalledWith('2', 'r1');
    });
  });

  it('removes a role from a user', async () => {
    const removeRole = vi.fn();
    rbacMock = createRBACStoreMock({
      roles: mockRoles,
      userRoles: mockUserRoles,
      isLoading: false,
      error: null,
      assignRole: vi.fn(),
      removeRole,
    });
    setupRBACStoreMock(rbacMock);
    render(<RoleManagementPanel users={mockUsers} />);
    // Find the remove button for Admin User's 'admin' role
    const removeButtons = screen.getAllByRole('button', { name: /remove role/i });
    expect(removeButtons.length).toBeGreaterThan(0);
    await act(async () => {
      await userEvent.click(removeButtons[0]);
    });
    await waitFor(() => {
      expect(removeRole).toHaveBeenCalledWith('1', 'r1');
    });
  });

  it('displays permissions for each role in the permissions viewer', () => {
    render(<RoleManagementPanel users={mockUsers} />);
    // Expand all details
    // Use getAllByText to find all summary elements (role names)
    const summaries = screen.getAllByText(/admin|user/i, { selector: 'summary' });
    summaries.forEach((summary) => fireEvent.click(summary));
    expect(screen.getAllByText('MANAGE_ROLES').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ADMIN_ACCESS').length).toBeGreaterThan(0);
  });

  it('handles loading, error, and empty states', () => {
    // Loading state
    rbacMock = createRBACStoreMock({
      roles: [],
      userRoles: [],
      isLoading: true,
      error: null,
      assignRole: vi.fn(),
      removeRole: vi.fn(),
    });
    setupRBACStoreMock(rbacMock);
    render(<RoleManagementPanel users={mockUsers} />);
    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);

    // Error state
    rbacMock = createRBACStoreMock({
      roles: [],
      userRoles: [],
      isLoading: false,
      error: 'Something went wrong',
      assignRole: vi.fn(),
      removeRole: vi.fn(),
    });
    setupRBACStoreMock(rbacMock);
    render(<RoleManagementPanel users={mockUsers} />);
    const errorMessages = screen.getAllByText(/something went wrong/i);
    expect(errorMessages.length).toBeGreaterThan(0);
    errorMessages.forEach(el => expect(el).toHaveAttribute('role', 'alert'));

    // Empty state
    rbacMock = createRBACStoreMock({
      roles: [],
      userRoles: [],
      isLoading: false,
      error: null,
      assignRole: vi.fn(),
      removeRole: vi.fn(),
    });
    setupRBACStoreMock(rbacMock);
    render(<RoleManagementPanel users={[]} />);
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    expect(screen.getByText(/no roles defined/i)).toBeInTheDocument();
  });
}); 
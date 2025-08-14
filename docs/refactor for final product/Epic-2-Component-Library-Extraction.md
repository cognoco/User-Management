# Epic 2: Component Library Extraction

**Duration:** 3 weeks  
**Priority:** High - Core of pluggable architecture  
**Epic Owner:** Frontend Architecture Team  
**Status:** Not Started  
**Prerequisites:** Epic 1 (Monorepo Transformation) must be complete

## Executive Summary

Component Library Extraction transforms the current mixed UI components into a clean three-tier architecture (primitives → headless → styled) with strict TypeScript and proper separation of concerns. This epic is the heart of making the platform truly pluggable, allowing host applications to use any layer of the component system.

**Key Insight:** We're building a component library that can be consumed at different levels - from basic building blocks to complete UI flows.

## Problem Statement

Current component architecture blocks pluggability:
- **Mixed concerns**: UI logic and business logic intertwined in components
- **Type safety issues**: 3,838 `any` types throughout codebase
- **No theming system**: Hard-coded styles prevent customization
- **Inconsistent patterns**: No clear component API conventions
- **Host integration impossible**: Components too coupled to specific implementations

## Objectives

### Primary Goal
Create a three-tier component architecture:
1. **Primitives**: Pure UI building blocks (Button, Input, Card)
2. **Headless**: Business logic with render props (LoginFlow, DataTable)
3. **Styled**: Complete compositions using primitives + headless

### Secondary Goals
- Eliminate ALL `any` types from component packages
- Implement comprehensive design token system
- Enable runtime theme switching
- Create Storybook documentation for all components
- Build foundation for host application theming

## Success Criteria

### Critical Success Factors
- [ ] 🎨 **Three-Tier Architecture**: Clear separation between primitives, headless, and styled
- [ ] 🔒 **Type Safety**: Zero `any` types in component packages
- [ ] 🎭 **Theme System**: Runtime light/dark mode switching works
- [ ] 🔌 **Host Integration**: Components can be themed by external applications
- [ ] 📚 **Documentation**: Complete Storybook with all component variations
- [ ] ⚡ **Performance**: Tree-shaking works correctly, no bundle bloat

### Quality Gates
1. All components pass strict TypeScript compilation
2. Theme switching works without page refresh
3. Host applications can override any visual aspect
4. Storybook demonstrates all component states
5. Bundle size analysis shows efficient tree-shaking

## Target Package Architecture

```
packages/
├── pump-primitives/              # Tier 1: Pure UI building blocks
│   ├── src/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Table/
│   │   ├── Dialog/
│   │   └── index.ts             # Barrel exports
│   └── package.json
├── pump-headless/               # Tier 2: Logic-only components
│   ├── src/
│   │   ├── auth/
│   │   │   ├── LoginFlow/
│   │   │   ├── RegistrationFlow/
│   │   │   └── PasswordResetFlow/
│   │   ├── forms/
│   │   ├── data/
│   │   └── navigation/
│   └── package.json
├── pump-styled/                 # Tier 3: Complete compositions
│   ├── src/
│   │   ├── LoginForm/           # Uses headless auth + primitives
│   │   ├── DataTable/           # Uses headless data + primitives
│   │   ├── Dashboard/
│   │   └── Settings/
│   └── package.json
├── pump-theme/                  # Design system foundation
│   ├── src/
│   │   ├── tokens/              # Design tokens
│   │   ├── providers/           # Theme providers
│   │   ├── hooks/               # Theme hooks
│   │   └── css/                 # CSS variable definitions
│   └── package.json
└── pump-icons/                  # Icon management
    ├── src/
    │   ├── icons/               # SVG icon components
    │   ├── Icon.tsx             # Generic icon wrapper
    │   └── types.ts             # Icon type definitions
    └── package.json
```

## Detailed Task Breakdown

### Task 2.1: Design Token System Development
**Owner:** Design Systems Team  
**Duration:** 4 days  
**Priority:** Critical

#### Design Token Foundation

**Color System**
```typescript
// packages/pump-theme/src/tokens/colors.ts
export const colorTokens = {
  // Semantic colors
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    900: '#1e3a8a'
  },
  // System colors
  background: {
    light: '#ffffff',
    dark: '#111827'
  },
  foreground: {
    light: '#111827', 
    dark: '#f9fafb'
  },
  // Status colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b'
} as const;
```

**Typography System**
```typescript
// packages/pump-theme/src/tokens/typography.ts
export const typographyTokens = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem', 
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem'
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625'
  }
} as const;
```

**Spacing & Layout**
```typescript
// packages/pump-theme/src/tokens/spacing.ts
export const spacingTokens = {
  space: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    6: '1.5rem',
    8: '2rem'
  },
  radius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px'
  }
} as const;
```

#### Theme Provider Implementation
```typescript
// packages/pump-theme/src/providers/ThemeProvider.tsx
interface ThemeContextValue {
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  toggle: () => void;
  tokens: TokenSystem;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light',
  customTokens = {}
}) => {
  // Implementation with CSS variable injection
  // Local storage persistence
  // System preference detection
};
```

#### Acceptance Criteria
- [ ] Complete design token system
- [ ] CSS variables generated automatically
- [ ] Theme provider with runtime switching
- [ ] TypeScript types for all tokens
- [ ] Storybook integration for design tokens

---

### Task 2.2: Primitive Components Development
**Owner:** Component Library Team  
**Duration:** 5 days  
**Priority:** Critical

#### Button Component (Example Implementation)
```typescript
// packages/pump-primitives/src/Button/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@pump/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
```

#### Component Testing Pattern
```typescript
// packages/pump-primitives/src/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('shows loading state', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });
});
```

#### Storybook Stories Pattern
```typescript
// packages/pump-primitives/src/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes.'
      }
    }
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'ghost', 'link']
    },
    size: {
      control: 'select', 
      options: ['default', 'sm', 'lg', 'icon']
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button'
  }
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  )
};
```

#### Target Primitive Components
- **Button**: All variants, loading states, icon support
- **Input**: Text, email, password, search with validation states
- **Card**: Header, content, footer compositions
- **Table**: Headers, rows, cells with sorting indicators
- **Dialog**: Modal, sheet, popover patterns
- **Select**: Single, multi-select with search
- **Checkbox**: Individual and group patterns
- **Radio**: Radio groups with validation
- **Switch**: Toggle switches
- **Badge**: Status indicators and labels

#### Acceptance Criteria
- [ ] 10+ primitive components implemented
- [ ] Zero TypeScript errors with strict mode
- [ ] Complete test coverage (>90%)
- [ ] Storybook stories for all variants
- [ ] Accessibility compliance (WCAG 2.1 AA)

---

### Task 2.3: Headless Components Development
**Owner:** Frontend Logic Team  
**Duration:** 6 days  
**Priority:** High

#### Authentication Flow Example
```typescript
// packages/pump-headless/src/auth/LoginFlow/LoginFlow.tsx
interface LoginFlowProps {
  onLogin: (credentials: LoginCredentials) => Promise<AuthResult>;
  onSuccess?: (user: User) => void;
  onError?: (error: AuthError) => void;
  children: (props: LoginFlowRenderProps) => React.ReactNode;
}

interface LoginFlowRenderProps {
  // Form state
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  
  // Flow state
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
  
  // Actions
  submit: () => Promise<void>;
  reset: () => void;
  
  // Validation
  isValid: boolean;
  fieldErrors: Record<string, string>;
}

export const LoginFlow: React.FC<LoginFlowProps> = ({
  onLogin,
  onSuccess,
  onError,
  children
}) => {
  // All business logic here
  // Form state management
  // Validation logic
  // Error handling
  // Success/failure flows
  
  const renderProps: LoginFlowRenderProps = {
    // ... all state and handlers
  };
  
  return children(renderProps);
};
```

#### Data Management Example
```typescript
// packages/pump-headless/src/data/DataTable/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onPaginate?: (page: number, pageSize: number) => void;
  children: (props: DataTableRenderProps<T>) => React.ReactNode;
}

interface DataTableRenderProps<T> {
  // Data state
  sortedData: T[];
  filteredData: T[];
  paginatedData: T[];
  
  // UI state
  currentPage: number;
  pageSize: number;
  totalPages: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  filters: Record<string, any>;
  
  // Actions
  setSortColumn: (column: string) => void;
  setFilters: (filters: Record<string, any>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Helpers
  getHeaderProps: (column: string) => HeaderProps;
  getRowProps: (row: T, index: number) => RowProps;
  getCellProps: (row: T, column: string) => CellProps;
}
```

#### Target Headless Components
- **Auth Flows**: Login, registration, password reset, MFA
- **Form Management**: Complex forms with validation, multi-step
- **Data Operations**: Tables, lists, search, filtering, pagination  
- **Navigation**: Routing, breadcrumbs, menu state
- **File Operations**: Upload, download, preview
- **Notifications**: Toast management, alert systems

#### Acceptance Criteria
- [ ] 15+ headless components covering major workflows
- [ ] Render props pattern consistently implemented
- [ ] Complete separation of logic and presentation
- [ ] Comprehensive TypeScript interfaces
- [ ] Business logic thoroughly tested

---

### Task 2.4: Styled Components Development
**Owner:** Full-Stack Component Team  
**Duration:** 4 days  
**Priority:** Medium

#### Styled Component Example
```typescript
// packages/pump-styled/src/LoginForm/LoginForm.tsx
import { LoginFlow } from '@pump/headless/auth/LoginFlow';
import { Button, Input, Card, CardHeader, CardContent, CardFooter } from '@pump/primitives';

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<AuthResult>;
  onSuccess?: (user: User) => void;
  onError?: (error: AuthError) => void;
  title?: string;
  subtitle?: string;
  showRememberMe?: boolean;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onSuccess,
  onError,
  title = 'Welcome back',
  subtitle = 'Sign in to your account',
  showRememberMe = true,
  className
}) => {
  return (
    <LoginFlow onLogin={onLogin} onSuccess={onSuccess} onError={onError}>
      {({
        email,
        setEmail,
        password,
        setPassword,
        rememberMe,
        setRememberMe,
        isLoading,
        error,
        validationErrors,
        submit,
        isValid
      }) => (
        <Card className={cn('w-full max-w-md', className)}>
          <CardHeader>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={validationErrors.email}
              required
            />
            
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={validationErrors.password}
              required
            />
            
            {showRememberMe && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                />
                <label htmlFor="remember" className="text-sm">
                  Remember me
                </label>
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <Button
              className="w-full"
              onClick={submit}
              disabled={!isValid}
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </CardFooter>
        </Card>
      )}
    </LoginFlow>
  );
};
```

#### Target Styled Components
- **LoginForm**: Complete auth forms using headless flows
- **DataTable**: Full-featured tables with all controls
- **Dashboard**: Layout compositions for admin panels
- **SettingsPanel**: User preference management
- **UserProfile**: Profile display and editing
- **NotificationCenter**: Toast and alert management

#### Acceptance Criteria
- [ ] 10+ styled components covering major UI patterns
- [ ] Proper composition of headless + primitives
- [ ] Consistent design language
- [ ] Responsive design patterns
- [ ] Accessibility best practices

---

### Task 2.5: Theme System Integration
**Owner:** Design Systems Team  
**Duration:** 2 days  
**Priority:** High

#### CSS Variable Generation
```typescript
// packages/pump-theme/src/css/variables.ts
export const generateCSSVariables = (tokens: TokenSystem, mode: 'light' | 'dark') => {
  return {
    '--color-primary': tokens.colors.primary[mode],
    '--color-background': tokens.colors.background[mode],
    '--color-foreground': tokens.colors.foreground[mode],
    '--font-sans': tokens.typography.fontFamily.sans.join(', '),
    '--radius-md': tokens.spacing.radius.md,
    // ... all other tokens
  };
};
```

#### Runtime Theme Switching
```typescript
// packages/pump-theme/src/hooks/useColorMode.ts
export const useColorMode = () => {
  const { mode, setMode, toggle } = useTheme();
  
  useEffect(() => {
    const root = document.documentElement;
    const variables = generateCSSVariables(tokens, mode);
    
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [mode]);
  
  return { mode, setMode, toggle };
};
```

#### Host Application Override Pattern
```typescript
// Example: Host app can override theme
const customTheme = {
  colors: {
    primary: {
      light: '#your-brand-color',
      dark: '#your-brand-color-dark'
    }
  }
};

// In host application
<ThemeProvider customTokens={customTheme}>
  <App />
</ThemeProvider>
```

#### Acceptance Criteria
- [ ] Complete CSS variable system
- [ ] Runtime theme switching without page refresh
- [ ] Host application theming patterns documented
- [ ] Performance optimized (no layout shifts)

## Integration Testing Strategy

### Cross-Package Integration
```typescript
// Test that styled components work with headless + primitives
describe('LoginForm Integration', () => {
  it('integrates headless logic with primitive UI', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    
    render(
      <ThemeProvider>
        <LoginForm onLogin={mockLogin} />
      </ThemeProvider>
    );
    
    // Test complete user flow
    await userEvent.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false
    });
  });
});
```

### Theme Integration Testing
```typescript
describe('Theme Integration', () => {
  it('applies theme variables correctly', () => {
    render(
      <ThemeProvider defaultMode="dark">
        <Button>Test</Button>
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    const styles = getComputedStyle(button);
    
    expect(styles.getPropertyValue('--color-primary')).toBe('#3b82f6');
  });
});
```

## Performance Considerations

### Bundle Size Optimization
- **Tree-shaking**: Proper ES module exports
- **Code splitting**: Package-level boundaries
- **Lazy loading**: Conditional component imports
- **Bundle analysis**: Webpack bundle analyzer integration

### Runtime Performance
- **Memoization**: React.memo for expensive components
- **Virtual scrolling**: For large data tables
- **Theme switching**: Optimized CSS variable updates
- **Event handling**: Debounced user inputs

## Documentation Strategy

### Storybook Organization
```
Storybook Structure:
├── Design System/
│   ├── Colors
│   ├── Typography  
│   ├── Spacing
│   └── Icons
├── Primitives/
│   ├── Button
│   ├── Input
│   ├── Card
│   └── ...
├── Headless/
│   ├── Auth Flows
│   ├── Data Management
│   └── Form Handling
└── Styled/
    ├── Login Form
    ├── Data Table
    └── Dashboard Layouts
```

### Component Documentation Template
```typescript
/**
 * Button component for user actions
 * 
 * @example
 * ```tsx
 * <Button variant="destructive" size="sm" isLoading>
 *   Delete Account
 * </Button>
 * ```
 */
```

## Risk Assessment

### High Risk Items
1. **Type Safety Migration**
   - Risk: 3,838 any types to eliminate
   - Mitigation: Focus on new packages first, gradual migration
   - Timeline: Spread across all component development

2. **Theme System Complexity**
   - Risk: CSS variable management becomes unwieldy
   - Mitigation: Start simple, iterate based on feedback
   - Contingency: Fallback to simpler theming approach

### Medium Risk Items
1. **Component API Consistency**
   - Risk: Inconsistent patterns across components
   - Mitigation: Clear guidelines, code reviews
   - Templates: Standardized component templates

2. **Performance Impact**
   - Risk: Component abstraction creates performance overhead
   - Mitigation: Performance testing, optimization
   - Monitoring: Bundle size and runtime performance tracking

## Definition of Done

### Technical Completion
- [ ] All component packages build with zero TypeScript errors
- [ ] Theme switching works seamlessly across all components
- [ ] Bundle size analysis shows efficient tree-shaking
- [ ] Accessibility audit passes for all components
- [ ] Performance benchmarks meet targets

### Quality Assurance
- [ ] >90% test coverage across all component packages
- [ ] Visual regression testing passes
- [ ] Cross-browser testing complete
- [ ] Documentation complete and accurate

### User Acceptance
- [ ] Components can be themed by host applications
- [ ] Developer experience is intuitive and productive
- [ ] Design team approves visual consistency
- [ ] Performance meets production requirements

## Success Metrics

### Quantitative Measures
- **Type Safety**: 0 `any` types in component packages
- **Bundle Size**: <50KB gzipped for core primitives
- **Performance**: <100ms theme switching
- **Test Coverage**: >90% for all component packages

### Qualitative Measures
- **Developer Experience**: Easy to build new components
- **Design Consistency**: Cohesive visual language
- **Pluggability**: Host apps can customize any aspect
- **Maintainability**: Clear separation of concerns

## Next Steps After Completion

1. **Epic 2 Retrospective**: Component library lessons learned
2. **Epic 3 Planning**: tRPC integration with components
3. **Host Integration Testing**: Real-world usage validation
4. **Performance Optimization**: Based on usage patterns

---

**Key Success Factor: This epic transforms chaotic components into a clean, typed, themeable system that forms the foundation of the pluggable platform.**
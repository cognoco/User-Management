# Responsive Design Guide

This guide covers the responsive design approach used throughout the User Management application. It outlines standardized breakpoints, utility functions, and component patterns to ensure a consistent mobile and desktop experience.

## Table of Contents

1. [Breakpoints](#breakpoints)
2. [Responsive Utilities](#responsive-utilities)
3. [Mobile-Optimized Components](#mobile-optimized-components)
4. [Responsive Form Patterns](#responsive-form-patterns)
5. [Mobile Design Best Practices](#mobile-design-best-practices)

## Breakpoints

The application uses standardized breakpoints that match Tailwind CSS defaults for consistency:

```typescript
// Located in src/lib/utils/responsive.ts
export const breakpoints = {
  sm: 640,   // Small devices (phones, 640px and up)
  md: 768,   // Medium devices (tablets, 768px and up)
  lg: 1024,  // Large devices (desktops, 1024px and up)
  xl: 1280,  // Extra large devices (large desktops, 1280px and up)
  '2xl': 1536 // 2XL screens (ultra wide desktops, 1536px and up)
};
```

## Responsive Utilities

### React Hooks

The following hooks are available in `src/lib/utils/responsive.ts`:

```typescript
// Check if viewport matches a custom media query
const matches = useMediaQuery('(max-width: 600px)');

// Convenient shorthand hooks
const isMobile = useIsMobile(); // < 768px
const isTablet = useIsTablet(); // 768px - 1023px
const isDesktop = useIsDesktop(); // >= 1024px
```

### Media Query Utility

For CSS-in-JS solutions, a utility function is provided:

```typescript
import { mediaQuery } from '@/lib/utils/responsive';

const styles = {
  [mediaQuery('md')]: {
    display: 'flex'
  },
  [mediaQuery('sm', 'max')]: {
    display: 'block'
  }
};
```

## Mobile-Optimized Components

### Enhanced Input Component

The standard Input component has been enhanced for mobile with:

- Larger touch targets (increased height)
- Support for mobile-specific input types
- Appropriate keyboard types on mobile devices
- Autocomplete attributes for better form filling

```tsx
<Input 
  mobileType="tel" 
  placeholder="Phone number" 
  // Will automatically use tel keyboard on mobile
/>

<Input 
  mobileType="email" 
  placeholder="Email address"
  // Will automatically use email keyboard with @ symbol
/>

<Input 
  mobileType="number" 
  placeholder="Quantity"
  // Will show numeric keyboard on mobile
/>
```

### Responsive DataTable

The DataTable component automatically switches between:

- **Table view** on desktop
- **Card view** on mobile and tablet

```tsx
<DataTable
  columns={[
    { key: 'name', header: 'Name', primaryColumn: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', hideOnMobile: true },
    { key: 'status', header: 'Status' },
  ]}
  data={users}
  searchable={true}
  rowActions={(row) => (
    <>
      <DropdownMenuItem onClick={() => handleEdit(row)}>Edit</DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleDelete(row)}>Delete</DropdownMenuItem>
    </>
  )}
/>
```

### Mobile-Friendly Navigation

The Header component implements:

- A full-screen mobile menu on small devices
- Automatic closing when navigating
- Prevention of background scrolling when menu is open
- Animation for smooth transitions

## Responsive Form Patterns

### Responsive Form Components

Use the components in `src/components/ui/form-responsive.tsx` for creating forms that adapt well to different screen sizes:

```tsx
import {
  ResponsiveForm,
  ResponsiveFormItems,
  ResponsiveFormRow,
  ResponsiveFormFooter,
  ResponsiveFormField
} from '@/components/ui/form-responsive';

// For regular forms (not using react-hook-form)
<ResponsiveForm>
  <ResponsiveFormItems>
    <ResponsiveFormRow 
      label="Full Name" 
      required 
      description="As it appears on your ID"
    >
      <Input placeholder="Enter your full name" />
    </ResponsiveFormRow>
    
    <ResponsiveFormRow 
      label="Email" 
      required
    >
      <Input mobileType="email" placeholder="Enter your email" />
    </ResponsiveFormRow>
  </ResponsiveFormItems>
  
  <ResponsiveFormFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Submit</Button>
  </ResponsiveFormFooter>
</ResponsiveForm>

// For react-hook-form
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <ResponsiveFormItems>
      <ResponsiveFormField
        name="email"
        label="Email"
        required
      >
        <Input mobileType="email" {...form.register("email")} />
      </ResponsiveFormField>
    </ResponsiveFormItems>
    
    <ResponsiveFormFooter>
      <Button type="submit">Submit</Button>
    </ResponsiveFormFooter>
  </form>
</Form>
```

## Mobile Design Best Practices

When developing new components or features, follow these guidelines:

1. **Touch targets**: Ensure interactive elements are at least 44×44 pixels in size.
2. **Input optimization**: 
   - Use appropriate input types with `mobileType` prop
   - Ensure form fields are large enough to tap easily
   - Group related inputs for easier form completion
   
3. **Responsive layouts**:
   - Use stack layouts on mobile instead of horizontal layouts
   - Consider collapsible sections for complex content
   - Always test at 320px minimum width

4. **Content prioritization**:
   - Hide less important information on mobile using `hideOnMobile` prop or conditional rendering
   - Push primary actions to the top where they're easily accessible

5. **Performance optimization**:
   - Implement code splitting to reduce initial load times
   - Lazy load images and off-screen content
   - Test on throttled connections

6. **Visual feedback**:
   - Provide clear loading indicators
   - Display progress for multi-step processes
   - Ensure state changes are clearly visible

By following these patterns and guidelines, we can ensure the User Management application provides a consistent, high-quality experience across all device sizes. 
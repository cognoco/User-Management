import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/primitives/card';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { DataTable } from '@/ui/styled/common/DataTable';
import { useIsMobile } from '@/lib/utils/responsive';
import {
  ResponsiveForm,
  ResponsiveFormItems,
  ResponsiveFormRow,
  ResponsiveFormFooter
} from '@/ui/primitives/form-responsive';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const mockUsers: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Editor', status: 'Inactive' },
  { id: 4, name: 'Dave Brown', email: 'dave@example.com', role: 'User', status: 'Active' },
];

export function ResponsiveExample(): React.ReactElement: JSX.Element {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
  });
  
  const isMobile = useIsMobile();
  
  const handleInputChange = (field: string, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    alert('Form submitted: ' + JSON.stringify(formData, null, 2));
  };
  
  // Example of rendering an action for the DataTable
  const renderRowActions = (user: User): JSX.Element => {
    return (
      <>
        <button onClick={() => alert(`Edit ${user.name}`)}>Edit</button>
        <button onClick={() => alert(`Delete ${user.name}`)}>Delete</button>
      </>
    );
  };
  
  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Responsive Design Examples</h1>
      
      {/* Responsive Form Example */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Responsive Form</h2>
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Enter user details to create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveForm>
              <form onSubmit={handleSubmit}>
                <ResponsiveFormItems>
                  <ResponsiveFormRow 
                    label="Full Name" 
                    required 
                    description="As it appears on your ID"
                  >
                    <Input 
                      placeholder="Enter your full name" 
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                    />
                  </ResponsiveFormRow>
                  
                  <ResponsiveFormRow 
                    label="Email" 
                    required
                  >
                    <Input 
                      mobileType="email" 
                      placeholder="Enter your email" 
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </ResponsiveFormRow>
                  
                  <ResponsiveFormRow 
                    label="Phone Number"
                    description="We'll use this for verification"
                  >
                    <Input 
                      mobileType="tel" 
                      placeholder="Enter your phone number" 
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </ResponsiveFormRow>
                  
                  <ResponsiveFormRow 
                    label="Role" 
                    required
                  >
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => handleInputChange('role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </ResponsiveFormRow>
                </ResponsiveFormItems>
                
                <ResponsiveFormFooter>
                  <Button variant="outline" type="button">Cancel</Button>
                  <Button type="submit">Create Account</Button>
                </ResponsiveFormFooter>
              </form>
            </ResponsiveForm>
          </CardContent>
        </Card>
      </section>
      
      {/* Responsive DataTable Example */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Responsive DataTable</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isMobile ? 
            'Viewing in Card Mode (Mobile View)' : 
            'Viewing in Table Mode (Desktop View)'
          }
        </p>
        
        <DataTable 
          columns={[
            { key: 'name', header: 'Name', primaryColumn: true, sortable: true },
            { key: 'email', header: 'Email', sortable: true },
            { key: 'role', header: 'Role', hideOnMobile: true },
            { key: 'status', header: 'Status', sortable: true },
          ]}
          data={mockUsers}
          searchable={true}
          rowActions={renderRowActions}
        />
      </section>
    </div>
  );
} 
/**
 * Styled Team Creator Component
 * 
 * This component provides a default styled implementation of the headless TeamCreator.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React from 'react';
import { TeamCreator as HeadlessTeamCreator, TeamCreatorProps } from '../../headless/team/TeamCreator';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Label } from '@/ui/primitives/label';
import { Textarea } from '@/ui/primitives/textarea';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';

export interface StyledTeamCreatorProps extends Omit<TeamCreatorProps, 'render'> {
  /**
   * Optional title for the team creator
   */
  title?: string;
  
  /**
   * Optional description for the team creator
   */
  description?: string;
  
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

export function TeamCreator({
  title = 'Create Team',
  description = 'Create a new team and add members',
  footer,
  className,
  ...headlessProps
}: StyledTeamCreatorProps): React.ReactElement {
  return (
    <HeadlessTeamCreator
      {...headlessProps}
      render={({
        handleSubmit,
        teamData,
        updateTeamData,
        isSubmitting,
        isSuccess,
        errors,
        touched,
        handleBlur,
        availableTeamTypes,
        teamSizeOptions,
        initialMembers,
        updateInitialMember,
        addInitialMember,
        removeInitialMember
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircledIcon className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Team created successfully
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={teamData.name}
                    onChange={(e) => updateTeamData('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    disabled={isSubmitting}
                    aria-invalid={touched.name && !!errors.name}
                    className={touched.name && errors.name ? 'border-red-500' : ''}
                  />
                  {touched.name && errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={teamData.description}
                    onChange={(e) => updateTeamData('description', e.target.value)}
                    onBlur={() => handleBlur('description')}
                    disabled={isSubmitting}
                    rows={3}
                    aria-invalid={touched.description && !!errors.description}
                    className={touched.description && errors.description ? 'border-red-500' : ''}
                  />
                  {touched.description && errors.description && (
                    <p className="text-sm text-red-500">{errors.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamType">Team Type</Label>
                    <Select
                      value={teamData.teamType}
                      onValueChange={(value) => updateTeamData('teamType', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="teamType">
                        <SelectValue placeholder="Select team type" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeamTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched.teamType && errors.teamType && (
                      <p className="text-sm text-red-500">{errors.teamType}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Team Size</Label>
                    <Select
                      value={teamData.teamSize}
                      onValueChange={(value) => updateTeamData('teamSize', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="teamSize">
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamSizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched.teamSize && errors.teamSize && (
                      <p className="text-sm text-red-500">{errors.teamSize}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium">Initial Team Members</h3>
                  <p className="text-sm text-gray-500">
                    Add initial members to your team. You can add more later.
                  </p>
                </div>
                
                {initialMembers.map((member, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`member-email-${index}`}>Email</Label>
                      <Input
                        id={`member-email-${index}`}
                        type="email"
                        value={member.email}
                        onChange={(e) => updateInitialMember(index, 'email', e.target.value)}
                        disabled={isSubmitting}
                        placeholder="member@example.com"
                      />
                      {member.error && (
                        <p className="text-sm text-red-500">{member.error}</p>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`member-role-${index}`}>Role</Label>
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateInitialMember(index, 'role', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id={`member-role-${index}`}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="mt-8"
                      onClick={() => removeInitialMember(index)}
                      disabled={isSubmitting || initialMembers.length <= 1}
                      aria-label="Remove member"
                    >
                      ✕<span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInitialMember}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  Add Another Member
                </Button>
              </div>
              
              {errors.form && (
                <Alert variant="destructive">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <AlertDescription>{errors.form}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Team...' : 'Create Team'}
                </Button>
              </div>
            </form>
          </CardContent>
          
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      )}
    />
  );
}

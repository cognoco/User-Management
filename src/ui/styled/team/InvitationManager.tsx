/**
 * Styled Invitation Manager Component
 *
 * This component provides a default styled implementation of the headless InvitationManager.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React from 'react';
import { InvitationManager as HeadlessInvitationManager, InvitationManagerProps } from '../../headless/team/InvitationManager';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { TeamInvitation } from '@/core/team/models';

export interface StyledInvitationManagerProps extends Omit<InvitationManagerProps, 'render'> {
  /**
   * Optional title for the invitation manager
   */
  title?: string;

  /**
   * Optional description for the invitation manager
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

export function InvitationManager({
  title = 'Manage Team Invitations',
  description = 'Send and manage invitations to your team',
  footer,
  className,
  ...headlessProps
}: StyledInvitationManagerProps) {
  return (
    <HeadlessInvitationManager
      {...headlessProps}
      render={({
        handleSendInvitation,
        emailValue,
        setEmailValue,
        roleValue,
        setRoleValue,
        isSubmitting,
        isValid,
        formErrors,
        touched,
        handleBlur,
        teamInvitations,
        userInvitations,
        acceptInvitation,
        declineInvitation,
        cancelInvitation,
        resendInvitation,
        refreshInvitations,
        isLoading,
        error,
        successMessage,
        availableRoles,
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircledIcon className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-6">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="send" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="send">Send Invitation</TabsTrigger>
                <TabsTrigger value="team">
                  Team Invitations ({teamInvitations.length})
                </TabsTrigger>
                <TabsTrigger value="user">
                  My Invitations ({userInvitations.length})
                </TabsTrigger>
              </TabsList>

              {/* Send Invitation Tab */}
              <TabsContent value="send" className="space-y-6 pt-4">
                <form onSubmit={handleSendInvitation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      disabled={isLoading || isSubmitting}
                      placeholder="colleague@example.com"
                      aria-invalid={touched.email && !!formErrors.email}
                      className={touched.email && formErrors.email ? 'border-red-500' : ''}
                    />
                    {touched.email && formErrors.email && (
                      <p className="text-sm text-red-500">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <Select
                      value={roleValue}
                      onValueChange={(value) => setRoleValue(value)}
                      disabled={isLoading || isSubmitting}
                    >
                      <SelectTrigger id="inviteRole">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched.role && formErrors.role && (
                      <p className="text-sm text-red-500">{formErrors.role}</p>
                    )}
                  </div>

                  {formErrors.form && (
                    <Alert variant="destructive">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{formErrors.form}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isLoading || isSubmitting || !isValid}
                    >
                      {isSubmitting ? 'Sending…' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Team Invitations Tab */}
              <TabsContent value="team" className="pt-4">
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshInvitations}
                    disabled={isLoading}
                  >
                    Refresh
                  </Button>
                </div>
                {teamInvitations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No team invitations found.
                  </p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamInvitations.map((invitation: TeamInvitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell>{invitation.email}</TableCell>
                            <TableCell>{invitation.role}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {invitation.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInvitation(invitation.id)}
                                disabled={isLoading}
                              >
                                Resend
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => cancelInvitation(invitation.id)}
                                disabled={isLoading}
                              >
                                Cancel
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* User Invitations Tab */}
              <TabsContent value="user" className="pt-4">
                {userInvitations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No pending invitations for you.
                  </p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userInvitations.map((invitation: TeamInvitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell>{invitation.teamId}</TableCell>
                            <TableCell>{invitation.role}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {invitation.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => acceptInvitation(invitation.id)}
                                disabled={isLoading}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => declineInvitation(invitation.id)}
                                disabled={isLoading}
                              >
                                Decline
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      )}
    />
  );
}

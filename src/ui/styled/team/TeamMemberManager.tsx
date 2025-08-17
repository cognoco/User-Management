/**
 * Styled Team Member Manager Component
 * 
 * This component provides a default styled implementation of the headless TeamMemberManager.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React from 'react';
import { useIsMobile } from '@/lib/utils/responsive';
import { TeamMemberManager as HeadlessTeamMemberManager, TeamMemberManagerProps } from '../../headless/team/TeamMemberManager';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/primitives/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';

export interface StyledTeamMemberManagerProps extends Omit<TeamMemberManagerProps, 'render'> {
  /**
   * Optional title for the team member manager
   */
  title?: string;
  
  /**
   * Optional description for the team member manager
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

export function TeamMemberManager({
  title = 'Manage Team Members',
  description = 'Add, remove, and update team members',
  footer,
  className,
  ...headlessProps
}: StyledTeamMemberManagerProps) {
  const isMobile = useIsMobile();
  return (
    <HeadlessTeamMemberManager
      {...headlessProps}
      render={({
        members,
        availableRoles,
        handleRoleChange,
        isLoading,
        error,
        isSuccess,
        confirmationState,
        setConfirmationState,
        handleConfirmRemove,
        cancelRemove
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
                  Team members updated successfully
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-6">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : isMobile ? (
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="border rounded-md p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading || member.isCurrentUser || !member.canRemove}
                        onClick={() => setConfirmationState({ memberId: member.id, memberName: member.name, isOpen: true })}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.id, value)}
                        disabled={isLoading || member.isCurrentUser || !member.canUpdateRole}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm">{member.joinedAt}</span>
                    </div>
                    <Dialog>
                      {confirmationState.isOpen && confirmationState.memberId === member.id && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Team Member</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {confirmationState.memberName} from the team? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="flex space-x-2 justify-end">
                            <Button variant="outline" onClick={cancelRemove}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleConfirmRemove(member.id)}>Remove Member</Button>
                          </DialogFooter>
                        </DialogContent>
                      )}
                    </Dialog>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-center py-6 text-gray-500">No team members found</div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatarUrl} alt={member.name} />
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                            disabled={isLoading || member.isCurrentUser || !member.canUpdateRole}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {member.isCurrentUser && (
                            <span className="text-xs text-gray-500 block mt-1">
                              (You)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {member.joinedAt}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isLoading || member.isCurrentUser || !member.canRemove}
                                onClick={() => setConfirmationState({ 
                                  memberId: member.id, 
                                  memberName: member.name,
                                  isOpen: true 
                                })}
                              >
                                Remove
                              </Button>
                            </DialogTrigger>
                            {confirmationState.isOpen && confirmationState.memberId === member.id && (
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Remove Team Member</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to remove {confirmationState.memberName} from the team? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="flex space-x-2 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={cancelRemove}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleConfirmRemove(member.id)}
                                  >
                                    Remove Member
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            )}
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {members.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                          No team members found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      )}
    />
  );
}

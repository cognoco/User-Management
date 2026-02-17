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
import { Switch } from '@/ui/primitives/switch';
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
}: StyledTeamCreatorProps) {
  return (
    <HeadlessTeamCreator
      {...headlessProps}
      render={({
        handleSubmit,
        nameValue,
        setNameValue,
        descriptionValue,
        setDescriptionValue,
        isPublicValue,
        setIsPublicValue,
        isSubmitting,
        errors,
        touched,
        handleBlur,
        successMessage,
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
                  {successMessage || 'Team created successfully'}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
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
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
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

                <div className="flex items-center space-x-3">
                  <Switch
                    id="isPublic"
                    checked={isPublicValue}
                    onCheckedChange={(checked) => setIsPublicValue(checked)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="isPublic">Public team (visible to everyone)</Label>
                </div>
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
                  {isSubmitting ? 'Creating Team…' : 'Create Team'}
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

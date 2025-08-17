'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/primitives/card';
import { Progress } from '@/ui/primitives/progress';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Define possible verification statuses
type VerificationStepStatus = 'pending' | 'completed' | 'failed' | 'action_required';

// Mock data structure for verification steps
interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: VerificationStepStatus;
  details?: string; // Optional details or error messages
}

// Mock verification data (replace with actual data fetching later)
const mockVerificationData = {
  overallStatus: 'pending', // 'not_verified', 'pending', 'verified', 'failed'
  progress: 40, // Percentage completion
  steps: [
    {
      id: 'profile_completion',
      title: 'Complete Company Profile',
      description: 'Fill in all required company details.',
      status: 'completed' as VerificationStepStatus,
    },
    {
      id: 'address_validation',
      title: 'Validate Primary Address',
      description: 'Verify your main business address.',
      status: 'completed' as VerificationStepStatus,
    },
    {
      id: 'document_upload',
      title: 'Upload Registration Document',
      description: 'Submit your official company registration certificate.',
      status: 'action_required' as VerificationStepStatus,
      details: 'Document scan is unclear. Please re-upload.'
    },
    {
      id: 'tax_id_verification',
      title: 'Verify Tax ID',
      description: 'Confirm your company tax identification number.',
      status: 'pending' as VerificationStepStatus,
    },
     {
      id: 'final_review',
      title: 'Manual Review',
      description: 'Our team will review your submission.',
      status: 'pending' as VerificationStepStatus,
    },
  ] as VerificationStep[],
};

// Helper to get icon based on status
const StatusIcon = ({ status }: { status: VerificationStepStatus }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'action_required':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'pending':
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

export function VerificationStatus(): React.ReactElement {
  const { t } = useTranslation();
  // TODO: Replace mock data with actual state/props from a store or API call
  const { overallStatus, progress, steps } = mockVerificationData;

  const getOverallStatusText = () => {
      switch(overallStatus) {
          case 'verified': return t('verification.status.verified');
          case 'failed': return t('verification.status.failed');
          case 'pending': return t('verification.status.pending');
          default: return t('verification.status.notVerified');
      }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('verification.title')}</CardTitle>
        <CardDescription>
          {t('verification.description', { status: getOverallStatusText() })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            {t('verification.progressText', { progress })}
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-md font-semibold">{t('verification.stepsTitle')}</h4>
          <ul className="space-y-4">
            {steps.map((step) => (
              <li key={step.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 pt-1">
                   <StatusIcon status={step.status} />
                </div>
                <div className="flex-grow">
                  <p className="font-medium">{t(`verification.steps.${step.id}.title`, step.title)}</p>
                  <p className="text-sm text-muted-foreground">
                     {t(`verification.steps.${step.id}.description`, step.description)}
                  </p>
                  {step.details && step.status === 'action_required' && (
                      <p className="text-sm text-yellow-600 mt-1">{t(`verification.steps.${step.id}.details`, step.details)}</p>
                  )}
                   {step.details && step.status === 'failed' && (
                      <p className="text-sm text-destructive mt-1">{t(`verification.steps.${step.id}.details`, step.details)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {overallStatus === 'failed' && (
             <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                 <p className="text-sm text-destructive font-medium">{t('verification.failureNotice')}</p>
            </div>
        )}
         {overallStatus === 'action_required' && (
             <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                 <p className="text-sm text-yellow-700 font-medium">{t('verification.actionRequiredNotice')}</p>
            </div>
        )}

        {/* 
          Consider adding buttons here for actions like:
          - Uploading required documents
          - Requesting manual review
          - Contacting support 
        */}
      </CardContent>
    </Card>
  );
} 
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { retentionService } from '@/lib/services/retention.service';

/**
 * API endpoint to check account retention status
 * 
 * GET /api/retention/check
 * Returns the user's retention status
 */
export async function GET(req: Request) {
  try {
    // Get user session 
    const session = await getSessionFromRequest(req as any);
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the user's retention status
    const retentionStatus = await retentionService.getUserRetentionStatus(session.userId);
    
    if (!retentionStatus) {
      return NextResponse.json(
        { message: 'No retention information found', status: 'active' },
        { status: 200 }
      );
    }
    
    // Format the response with a more user-friendly view
    return NextResponse.json(
      {
        status: retentionStatus.status,
        lastActive: retentionStatus.last_login_at || retentionStatus.last_activity_at,
        becomeInactiveAt: retentionStatus.become_inactive_at,
        anonymizeAt: retentionStatus.anonymize_at,
        inactivityPeriod: retentionStatus.retention_type === 'personal' ? '24 months' : '36 months',
        gracePeriod: '30 days',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking retention status:', error);
    return NextResponse.json(
      { error: 'Failed to check retention status' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getSession } from '@/lib/auth/session';
import { retentionService } from '@/lib/services/retention.service';

/**
 * API endpoint to reactivate an inactive account
 * 
 * POST /api/retention/reactivate
 * Reactivates the user's account if it's in an inactive state
 */
export async function POST(req: Request) {
  try {
    // Get user session 
    const session = await getSessionFromRequest(req as any);
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Attempt to reactivate the account
    try {
      await retentionService.reactivateAccount(session.userId);
      
      return NextResponse.json(
        { message: 'Account successfully reactivated' },
        { status: 200 }
      );
    } catch (reactivationError: any) {
      // Handle specific reactivation errors
      if (reactivationError.message === 'Cannot reactivate an anonymized account') {
        return NextResponse.json(
          { error: 'This account has already been anonymized and cannot be reactivated' },
          { status: 400 }
        );
      }
      
      throw reactivationError;
    }
  } catch (error) {
    console.error('Error reactivating account:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate account' },
      { status: 500 }
    );
  }
} 
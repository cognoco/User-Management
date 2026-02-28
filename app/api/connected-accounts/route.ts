import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/utils';
import { connectedAccountsService } from '@/services/connected-accounts/connected-accounts.service';

// GET /api/connected-accounts - fetch all connected accounts for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accounts = await connectedAccountsService.listByUser(user.id);
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch connected accounts' },
      { status: 500 }
    );
  }
}

// DELETE /api/connected-accounts/[accountId] - disconnect a provider
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const accountId = url.pathname.split('/').pop();
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }
    const deleted = await connectedAccountsService.deleteByIdForUser(accountId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}

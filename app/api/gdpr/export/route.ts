import { NextResponse } from 'next/server';
import { withValidatedServices, schemas } from '@/lib/api/with-services';

const getHandler = async ({ userId, services }: { userId?: string, services: any }) => {
  try {
    const exportData = await services.gdpr.exportUserData(userId!);
    if (!exportData) {
      return NextResponse.json({ error: 'Failed to generate data export.' }, { status: 500 });
    }

    const jsonData = JSON.stringify(exportData.data, null, 2);

    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${exportData.filename}"`,
      },
    });
  } catch (error) {
    console.error(`Error during data export for user ${userId}:`, error);
    return NextResponse.json({ error: 'Failed to generate data export.' }, { status: 500 });
  }
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['gdpr'],
  requireAuth: true,
  handler: getHandler
});

import { NextResponse } from 'next/server';
import { getHealthService } from '@/services/health';

const SERVICE_NAMES = ['database', 'redis', 'email', 'storage'] as const;

export async function GET() {
  const healthService = getHealthService();
  const services = Object.fromEntries(
    SERVICE_NAMES.map((name) => [name, healthService.getServiceHealth(name)])
  );

  return NextResponse.json(services);
}

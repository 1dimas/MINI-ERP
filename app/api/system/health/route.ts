import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { SystemService } from '@/src/system/system.service';

const systemService = new SystemService(prisma as any);

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const report = await systemService.getHealthCheck();
    return NextResponse.json(report);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal memproses diagnostik kesehatan sistem' },
      { status }
    );
  }
}

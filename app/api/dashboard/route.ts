import { getDashboardStats } from '@/lib/mock/data';
import type { ApiResponse } from '@/lib/types';

export async function GET() {
    const stats = getDashboardStats();
    return Response.json({ success: true, data: stats } satisfies ApiResponse<typeof stats>);
}


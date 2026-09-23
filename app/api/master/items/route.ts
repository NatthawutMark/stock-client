import { items } from '@/lib/mock/data';
import type { ApiResponse, MastItem } from '@/lib/types';

const db = [...items];
let nextId = db.length + 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';

  const filtered = search
    ? db.filter(r => r.itemCode.toLowerCase().includes(search) || r.itemName.toLowerCase().includes(search))
    : db;

  return Response.json({
    success: true,
    data: filtered.filter(r => !r.isDelete),
    total: filtered.length,
  } satisfies ApiResponse<MastItem[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const record: MastItem = {
    ...body,
    id: nextId++,
    createDate: now,
    updateDate: now,
    createBy: 'admin',
    updateBy: 'admin',
    isDelete: false,
  };
  db.push(record);
  return Response.json({ success: true, data: record } satisfies ApiResponse<MastItem>, { status: 201 });
}


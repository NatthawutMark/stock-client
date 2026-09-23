import { uoms } from '@/lib/mock/data';
import type { ApiResponse, MastUom } from '@/lib/types';

const db = [...uoms];
let nextId = db.length + 1;

export async function GET() {
  return Response.json({ success: true, data: db.filter(r => !r.isDelete), total: db.length } satisfies ApiResponse<MastUom[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const record: MastUom = { ...body, id: nextId++, createDate: now, updateDate: now, createBy: 'admin', updateBy: 'admin', isDelete: false };
  db.push(record);
  return Response.json({ success: true, data: record } satisfies ApiResponse<MastUom>, { status: 201 });
}


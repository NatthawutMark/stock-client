import { items } from '@/lib/mock/data';
import type { ApiResponse, MastItem } from '@/lib/types';

const db = [...items];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = db.find(r => r.id === Number(id));
  if (!record) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  return Response.json({ success: true, data: record } satisfies ApiResponse<MastItem>);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = db.findIndex(r => r.id === Number(id));
  if (idx === -1) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  const body = await request.json();
  db[idx] = { ...db[idx], ...body, updateDate: new Date().toISOString(), updateBy: 'admin' };
  return Response.json({ success: true, data: db[idx] } satisfies ApiResponse<MastItem>);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = db.findIndex(r => r.id === Number(id));
  if (idx === -1) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  db[idx] = { ...db[idx], isDelete: true, updateDate: new Date().toISOString() };
  return Response.json({ success: true, data: { id: Number(id) } });
}


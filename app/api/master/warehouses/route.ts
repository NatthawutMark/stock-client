import { warehouses } from '@/lib/mock/data';
import type { ApiResponse, MastWarehouse } from '@/lib/types';

const db = [...warehouses];
let nextId = db.length + 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';
  const filtered = search ? db.filter(r => r.code.toLowerCase().includes(search) || r.warehouseName.toLowerCase().includes(search)) : db;
  return Response.json({ success: true, data: filtered.filter(r => !r.isDelete), total: filtered.length } satisfies ApiResponse<MastWarehouse[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const record: MastWarehouse = { ...body, id: nextId++, createDate: now, updateDate: now, createBy: 'admin', updateBy: 'admin', isDelete: false };
  db.push(record);
  return Response.json({ success: true, data: record } satisfies ApiResponse<MastWarehouse>, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const idx = db.findIndex(r => r.id === body.id);
  if (idx === -1) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  db[idx] = { ...db[idx], ...body, updateDate: new Date().toISOString() };
  return Response.json({ success: true, data: db[idx] } satisfies ApiResponse<MastWarehouse>);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  const idx = db.findIndex(r => r.id === id);
  if (idx === -1) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  db[idx] = { ...db[idx], isDelete: true };
  return Response.json({ success: true, data: { id } });
}


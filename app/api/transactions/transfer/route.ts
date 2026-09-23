import { docTransfers, statuses, warehouses } from '@/lib/mock/data';
import type { ApiResponse, DocTransfer, DocTransferView } from '@/lib/types';

const db = [...docTransfers];
let nextId = db.length + 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';

  const enriched: DocTransferView[] = db.map(r => ({
    ...r,
    fromWarehouseName: warehouses.find(w => w.id === r.fromWarehouseId)?.warehouseName,
    toWarehouseName: warehouses.find(w => w.id === r.toWarehouseId)?.warehouseName,
    statusName: statuses.find(s => s.id === r.statusId)?.nameTh,
  }));

  const filtered = search
    ? enriched.filter(r => r.docNo.toLowerCase().includes(search))
    : enriched;

  return Response.json({ success: true, data: filtered.filter(r => !r.isDelete), total: filtered.length } satisfies ApiResponse<DocTransferView[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const doc: DocTransfer = {
    ...body,
    id: nextId++,
    docNo: `TRF${new Date().getFullYear()}${String(nextId).padStart(3, '0')}`,
    statusId: 7,
    createDate: now,
    updateDate: now,
    createBy: 'admin',
    updateBy: 'admin',
    isDelete: false,
  };
  db.push(doc);
  return Response.json({ success: true, data: doc } satisfies ApiResponse<DocTransfer>, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const idx = db.findIndex(r => r.id === body.id);
  if (idx === -1) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  db[idx] = { ...db[idx], ...body, updateDate: new Date().toISOString() };
  return Response.json({ success: true, data: db[idx] } satisfies ApiResponse<DocTransfer>);
}


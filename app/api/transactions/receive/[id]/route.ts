import { docReceives, docReceiveDetails, statuses, warehouses, vendors, docTypes } from '@/lib/mock/data';
import type { ApiResponse, DocReceive, DocReceiveView } from '@/lib/types';

const db = [...docReceives];
const detailDb = [...docReceiveDetails];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = db.find(r => r.id === Number(id));
  if (!record) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  const details = detailDb.filter(d => d.docId === record.id);
  const enriched: DocReceiveView = {
    ...record,
    vendorName: vendors.find(v => v.id === record.vendorId)?.vendName,
    warehouseName: warehouses.find(w => w.id === record.warehouseId)?.warehouseName,
    statusName: statuses.find(s => s.id === record.statusId)?.nameTh,
    docTypeName: docTypes.find(d => d.id === record.docTypeId)?.name,
  };
  return Response.json({ success: true, data: { ...enriched, details } } satisfies ApiResponse<DocReceiveView & { details: typeof details }>);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = db.findIndex(r => r.id === Number(id));
  if (idx === -1) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  const body = await request.json();
  db[idx] = { ...db[idx], ...body, updateDate: new Date().toISOString() };
  return Response.json({ success: true, data: db[idx] } satisfies ApiResponse<DocReceive>);
}


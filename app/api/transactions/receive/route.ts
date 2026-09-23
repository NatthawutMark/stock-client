import { docReceives, docReceiveDetails, statuses, warehouses, vendors, docTypes } from '@/lib/mock/data';
import type { ApiResponse, DocReceive, DocReceiveView } from '@/lib/types';

const db = [...docReceives];
const detailDb = [...docReceiveDetails];
let nextId = db.length + 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';

  const enriched: DocReceiveView[] = db.map(r => ({
    ...r,
    vendorName: vendors.find(v => v.id === r.vendorId)?.vendName,
    warehouseName: warehouses.find(w => w.id === r.warehouseId)?.warehouseName,
    statusName: statuses.find(s => s.id === r.statusId)?.nameTh,
    docTypeName: docTypes.find(d => d.id === r.docTypeId)?.name,
  }));

  const filtered = search
    ? enriched.filter(r => r.docNo.toLowerCase().includes(search) || r.vendorName?.toLowerCase().includes(search))
    : enriched;

  return Response.json({ success: true, data: filtered.filter(r => !r.isDelete), total: filtered.length } satisfies ApiResponse<DocReceiveView[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const { details, ...docData } = body;
  const doc: DocReceive = {
    ...docData,
    id: nextId++,
    docNo: `GR${new Date().getFullYear()}${String(nextId).padStart(3, '0')}`,
    createDate: now,
    updateDate: now,
    createBy: 'admin',
    updateBy: 'admin',
    isDelete: false,
  };
  db.push(doc);
  return Response.json({ success: true, data: doc } satisfies ApiResponse<DocReceive>, { status: 201 });
}


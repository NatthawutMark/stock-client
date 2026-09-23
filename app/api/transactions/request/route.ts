import { docRequests, statuses, locations, warehouses } from '@/lib/mock/data';
import type { ApiResponse, DocRequest, DocRequestView } from '@/lib/types';

const db = [...docRequests];
let nextId = db.length + 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';

  const enriched: DocRequestView[] = db.map(r => ({
    ...r,
    fromLocationName: locations.find(l => l.id === r.fromLocationId)?.name,
    toWarehouseName: warehouses.find(w => w.id === r.toWarehouseId)?.warehouseName,
    statusName: statuses.find(s => s.id === r.statusId)?.nameTh,
  }));

  const filtered = search ? enriched.filter(r => r.docNo.toLowerCase().includes(search)) : enriched;
  return Response.json({ success: true, data: filtered.filter(r => !r.isDelete), total: filtered.length } satisfies ApiResponse<DocRequestView[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const doc: DocRequest = {
    ...body,
    id: nextId++,
    docNo: `REQ${new Date().getFullYear()}${String(nextId).padStart(3, '0')}`,
    statusId: 1,
    createDate: now,
    updateDate: now,
    createBy: 'admin',
    updateBy: 'admin',
    isDelete: false,
  };
  db.push(doc);
  return Response.json({ success: true, data: doc } satisfies ApiResponse<DocRequest>, { status: 201 });
}


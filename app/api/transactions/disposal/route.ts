import { docDisposals, statuses, warehouses } from '@/lib/mock/data';
import type { ApiResponse, DocDisposal, DocDisposalView } from '@/lib/types';

const db = [...docDisposals];
let nextId = db.length + 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';

  const enriched: DocDisposalView[] = db.map(r => ({
    ...r,
    warehouseName: warehouses.find(w => w.id === r.warehouseId)?.warehouseName,
    statusName: statuses.find(s => s.id === r.statusId)?.nameTh,
  }));

  const filtered = search ? enriched.filter(r => r.docNo.toLowerCase().includes(search)) : enriched;
  return Response.json({ success: true, data: filtered.filter(r => !r.isDelete), total: filtered.length } satisfies ApiResponse<DocDisposalView[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const doc: DocDisposal = {
    ...body,
    id: nextId++,
    docNo: `DSP${new Date().getFullYear()}${String(nextId).padStart(3, '0')}`,
    statusId: 1,
    createDate: now,
    updateDate: now,
    createBy: 'admin',
    updateBy: 'admin',
    isDelete: false,
  };
  db.push(doc);
  return Response.json({ success: true, data: doc } satisfies ApiResponse<DocDisposal>, { status: 201 });
}


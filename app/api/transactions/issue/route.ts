import { docIssues, docIssueDetails, statuses, warehouses, customers, docTypes } from '@/lib/mock/data';
import type { ApiResponse, DocIssue, DocIssueView } from '@/lib/types';

const db = [...docIssues];
let nextId = db.length + 1;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';

  const enriched: DocIssueView[] = db.map(r => ({
    ...r,
    customerName: customers.find(c => c.id === r.customerId)?.custName,
    warehouseName: warehouses.find(w => w.id === r.warehouseId)?.warehouseName,
    statusName: statuses.find(s => s.id === r.statusId)?.nameTh,
    docTypeName: docTypes.find(d => d.id === r.docTypeId)?.name,
  }));

  const filtered = search
    ? enriched.filter(r => r.docNo.toLowerCase().includes(search) || r.customerName?.toLowerCase().includes(search))
    : enriched;

  return Response.json({ success: true, data: filtered.filter(r => !r.isDelete), total: filtered.length } satisfies ApiResponse<DocIssueView[]>);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const { details, ...docData } = body;
  const doc: DocIssue = {
    ...docData,
    id: nextId++,
    docNo: `GI${new Date().getFullYear()}${String(nextId).padStart(3, '0')}`,
    createDate: now,
    updateDate: now,
    createBy: 'admin',
    updateBy: 'admin',
    isDelete: false,
  };
  db.push(doc);
  return Response.json({ success: true, data: doc } satisfies ApiResponse<DocIssue>, { status: 201 });
}


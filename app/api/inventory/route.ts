import { inventories, items, locations, warehouses, uoms } from '@/lib/mock/data';
import type { ApiResponse, InventoryView } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';
  const warehouseId = searchParams.get('warehouseId') ? Number(searchParams.get('warehouseId')) : null;

  const enriched: InventoryView[] = inventories.map(inv => {
    const item = items.find(i => i.id === inv.itemId);
    return {
      ...inv,
      itemCode: item?.itemCode,
      itemName: item?.itemName,
      locationName: locations.find(l => l.id === inv.locationId)?.name,
      warehouseName: warehouses.find(w => w.id === inv.warehouseId)?.warehouseName,
      uomName: uoms.find(u => u.id === item?.uomId)?.name,
    };
  });

  let filtered = enriched.filter(r => !r.isDelete);
  if (warehouseId) filtered = filtered.filter(r => r.warehouseId === warehouseId);
  if (search) filtered = filtered.filter(r =>
    r.itemCode?.toLowerCase().includes(search) ||
    r.itemName?.toLowerCase().includes(search) ||
    r.lotNo?.toLowerCase().includes(search) ||
    r.serialNo?.toLowerCase().includes(search)
  );

  return Response.json({ success: true, data: filtered, total: filtered.length } satisfies ApiResponse<InventoryView[]>);
}


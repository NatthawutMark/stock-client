import { inventories, items, locations, warehouses, uoms } from '@/lib/mock/data';
import type { ApiResponse, InventoryView } from '@/lib/types';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = inventories.find(r => r.id === Number(id));
  if (!inv) return Response.json({ success: false, data: null, message: 'Not found' }, { status: 404 });
  const item = items.find(i => i.id === inv.itemId);
  const enriched: InventoryView = {
    ...inv,
    itemCode: item?.itemCode,
    itemName: item?.itemName,
    locationName: locations.find(l => l.id === inv.locationId)?.name,
    warehouseName: warehouses.find(w => w.id === inv.warehouseId)?.warehouseName,
    uomName: uoms.find(u => u.id === item?.uomId)?.name,
  };
  return Response.json({ success: true, data: enriched } satisfies ApiResponse<InventoryView>);
}


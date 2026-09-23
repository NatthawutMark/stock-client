import type { Inventory, InventoryView, PaginationParams } from '../../types';
import { apiClient } from '../client';

export const inventoryService = {
  list: (p?: PaginationParams & { warehouseId?: number }) => {
    const q = new URLSearchParams();
    if (p?.page) q.set('page', String(p.page));
    if (p?.limit) q.set('limit', String(p.limit));
    if (p?.search) q.set('search', p.search);
    if (p?.warehouseId) q.set('warehouseId', String(p.warehouseId));
    return apiClient.get<InventoryView[]>(`/api/inventory?${q}`);
  },
  get: (id: number) => apiClient.get<InventoryView>(`/api/inventory/${id}`),
};


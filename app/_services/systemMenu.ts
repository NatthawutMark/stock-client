import type { SysMenu, PaginationParams } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

export const SystemMenuService = {
    list: (p?: PaginationParams & { warehouseId?: number }) => {
        const q = new URLSearchParams();
        if (p?.page) q.set('page', String(p.page));
        if (p?.limit) q.set('limit', String(p.limit));
        if (p?.search) q.set('search', p.search);
        if (p?.warehouseId) q.set('warehouseId', String(p.warehouseId));
        return apiClient.get<SysMenu[]>(`/api/systemmenu?${q}`);
    },
    transactionList: () => apiClient.get<SysMenu[]>(`/api/systemmenu/getTransactionMenu`),
};


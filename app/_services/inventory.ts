import type { InventoryView, PaginationParams } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

export interface InventoryListParams extends PaginationParams {
    warehouseId?: number | string;
    locationId?: number | string;
    itemId?: number | string;
    itemCode?: string;
    lotNo?: string;
    serialNo?: string;
    status?: string;
}
export interface IssueInventoryList extends PaginationParams {
    id: string;
    itemId: string;
    itemName: string;
    lotNo: string;
    serialNo: string;
    availableQty: number;
    itemPrice: number;
    locationName: string;
    uomName: string;
    mfgDate?: string;
    expireDate?: string;
    warehouseName: string;
}



export interface IssueInventoryResult {
    data?: IssueInventoryList[];
    total?: number;
    page?: number;
    size?: number;
    limit?: number;
    [key: string]: unknown;
}

export const inventoryService = {
    list: (p?: InventoryListParams) => {
        // const q = new URLSearchParams();
        // if (p) {
        //     for (const [key, val] of Object.entries(p)) {
        //         if (val !== undefined && val !== null && val !== '') {
        //             q.set(key, String(val));
        //         }
        //     }
        // }
        return apiClient.post<InventoryView[]>(`/api/inventory/list`, p);
    },
    listAll: (p?: InventoryListParams) => {
        return apiClient.post<InventoryView[]>(`/api/inventory/listAll`, p);
    },
    get: (id: number | string) => apiClient.get<InventoryView>(`/api/inventory/${id}`),
    issueInventoryList: (data?: Record<string, unknown>) => {
        return apiClient.post<IssueInventoryResult>(`/api/inventory/listForIssue`, data);
    }
};

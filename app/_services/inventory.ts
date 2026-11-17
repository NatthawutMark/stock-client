import type { InventoryView, PaginationParams } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

export interface InventoryListParams extends PaginationParams {
    warehouseId?: string;
    locationId?: string;
    itemId?: string;
    itemCode?: string;
    lotNo?: string;
    serialNo?: string;
    status?: string;
}

export interface IssueInventoryList {
    id: string;
    itemId: string;
    itemCode?: string;
    itemName: string;
    lotNo?: string;
    serialNo?: string;
    availableQty: number;
    itemPrice: number;
    locationId?: string;
    locationName?: string;
    uomId?: string;
    uomName?: string;
    mfgDate?: string;
    expireDate?: string;
    warehouseId?: string;
    warehouseName?: string;
}

export interface IssueInventoryParams {
    menuId?: string;
    warehouseId: string;
    docId?: string;
    [key: string]: unknown;
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
    list: (p?: InventoryListParams) =>
        apiClient.post<InventoryView[]>('/api/inventory/list', p),
    listAll: (p?: InventoryListParams) =>
        apiClient.post<InventoryView[]>('/api/inventory/listAll', p),
    get: (id: string) =>
        apiClient.get<InventoryView>(`/api/inventory/${id}`),
    issueInventoryList: (data?: IssueInventoryParams) =>
        apiClient.post<IssueInventoryResult>('/api/inventory/listForIssue', data),
};

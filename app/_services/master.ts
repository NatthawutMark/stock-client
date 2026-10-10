import type {
    MastItem, MastBrand, MastWarehouse, MastLocation, MastUom, MastVendor, MastCustomer,
    MastDocType, MastTransType,
    PaginationParams, ApiResponse,
} from '@/lib/types';
import { apiClient } from '@/lib/api/client';

export type MasterResult<T = unknown> = ApiResponse<T>;

export const masterService = {
    // ─── Items ───────────────────────────────────────────────────
    items: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastItem[]>>('/api/MastItem/list', {
                itemCode: p?.search || '',
            });
        },
        getByCode: (code: string) =>
            apiClient.get<MasterResult<MastItem>>(`/api/MastItem/getByCode?code=${encodeURIComponent(code)}`),
        create: (data: Partial<MastItem>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastItem/create', data),
        update: (data: Partial<MastItem>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastItem/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastItem/delete', { id }),
    },

    // ─── Brands ──────────────────────────────────────────────────
    brands: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastBrand[]>>('/api/MastBrand/list', {
                nameTh: p?.search || '',
            });
        },
        getByName: (name: string) =>
            apiClient.get<MasterResult<MastBrand>>(`/api/MastBrand/getByName?name=${encodeURIComponent(name)}`),
        create: (data: Partial<MastBrand>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastBrand/create', data),
        update: (data: Partial<MastBrand>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastBrand/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastBrand/delete', { id }),
    },

    // ─── Warehouses ──────────────────────────────────────────────
    warehouses: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastWarehouse[]>>('/api/MastWarehouse/list', {
                Code: p?.search || '',
            });
        },
        getByCode: (code: string) =>
            apiClient.get<MasterResult<MastWarehouse>>(`/api/MastWarehouse/getByCode?code=${encodeURIComponent(code)}`),
        create: (data: Partial<MastWarehouse>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastWarehouse/create', data),
        update: (data: Partial<MastWarehouse>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastWarehouse/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastWarehouse/delete', { id }),
    },

    // ─── Locations ───────────────────────────────────────────────
    locations: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastLocation[]>>('/api/MastLocation/list', {
                code: p?.search || '',
            });
        },
        getByName: (name: string) =>
            apiClient.get<MasterResult<MastLocation>>(`/api/MastLocation/getByName?name=${encodeURIComponent(name)}`),
        create: (data: Partial<MastLocation>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastLocation/create', data),
        update: (data: Partial<MastLocation>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastLocation/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastLocation/delete', { id }),
    },

    // ─── UOMs ────────────────────────────────────────────────────
    uoms: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastUom[]>>('/api/MastUom/list', {
                name: p?.search || '',
            });
        },
        getByName: (name: string) =>
            apiClient.get<MasterResult<MastUom>>(`/api/MastUom/getByName?name=${encodeURIComponent(name)}`),
        create: (data: Partial<MastUom>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastUom/create', data),
        update: (data: Partial<MastUom>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastUom/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastUom/delete', { id }),
    },

    // ─── Vendors ─────────────────────────────────────────────────
    vendors: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastVendor[]>>('/api/MastVendor/list', {
                vendCode: p?.search || '',
                vendName: p?.search || '',
            });
        },
        getByCode: (code: string) =>
            apiClient.get<MasterResult<MastVendor>>(`/api/MastVendor/getByCode?code=${encodeURIComponent(code)}`),
        create: (data: Partial<MastVendor>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastVendor/create', data),
        update: (data: Partial<MastVendor>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastVendor/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastVendor/delete', { id }),
    },

    // ─── Customers ───────────────────────────────────────────────
    customers: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastCustomer[]>>('/api/MastCustomer/list', {
                custCode: p?.search || '',
                custName: p?.search || '',
            });
        },
        getByCode: (code: string) =>
            apiClient.get<MasterResult<MastCustomer>>(`/api/MastCustomer/getByCode?Code=${encodeURIComponent(code)}`),
        create: (data: Partial<MastCustomer>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastCustomer/create', data),
        update: (data: Partial<MastCustomer>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastCustomer/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastCustomer/delete', { id }),
    },

    // ─── DocTypes ────────────────────────────────────────────────
    docTypes: {
        list: (p?: PaginationParams & { transTypeId?: number | string; menuId?: number | string; isActive?: boolean }) => {
            const transId = p?.menuId ?? p?.transTypeId;
            return apiClient.post<MasterResult<MastDocType[]>>('/api/MastDocType/list', {
                name: p?.search || '',
                transTypeId: transId ? String(transId) : undefined,
                menuId: transId ? String(transId) : undefined,
                isActive: p?.isActive !== undefined ? p.isActive : undefined,
            });
        },
        getById: (id: string | number) =>
            apiClient.get<MasterResult<MastDocType>>(`/api/MastDocType/getById?id=${id}`),
        create: (data: Partial<MastDocType>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastDocType/create', data),
        update: (data: Partial<MastDocType>) =>
            apiClient.post<MasterResult<unknown>>('/api/MastDocType/update', data),
        remove: (id: string | number) =>
            apiClient.post<MasterResult<unknown>>('/api/MastDocType/delete', { id }),
    },

    // ─── TransTypes ──────────────────────────────────────────────
    transTypes: {
        list: (p?: PaginationParams) => {
            return apiClient.post<MasterResult<MastTransType[]>>('/api/MastTransType/list', {
                name: p?.search || '',
            });
        },
    },
};

import type {
  MastItem, MastBrand, MastWarehouse, MastLocation, MastUom, MastVendor, MastCustomer,
  ApiResponse, PaginationParams,
} from '../../types';
import { apiClient } from '../client';

// ─── Items ───────────────────────────────────────────────────
export const masterService = {
  items: {
    list: (p?: PaginationParams) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      if (p?.search) q.set('search', p.search);
      return apiClient.get<MastItem[]>(`/api/master/items?${q}`);
    },
    get: (id: number) => apiClient.get<MastItem>(`/api/master/items/${id}`),
    create: (data: Omit<MastItem, 'id' | 'createDate' | 'updateDate'>) =>
      apiClient.post<MastItem>('/api/master/items', data),
    update: (id: number, data: Partial<MastItem>) =>
      apiClient.put<MastItem>(`/api/master/items/${id}`, data),
    remove: (id: number) => apiClient.delete<{ id: number }>(`/api/master/items/${id}`),
  },
  brands: {
    list: (p?: PaginationParams) => {
      const q = new URLSearchParams();
      if (p?.search) q.set('search', p.search);
      return apiClient.get<MastBrand[]>(`/api/master/brands?${q}`);
    },
    create: (data: Omit<MastBrand, 'id' | 'createDate' | 'updateDate'>) =>
      apiClient.post<MastBrand>('/api/master/brands', data),
    update: (id: number, data: Partial<MastBrand>) =>
      apiClient.put<MastBrand>(`/api/master/brands/${id}`, data),
    remove: (id: number) => apiClient.delete<{ id: number }>(`/api/master/brands/${id}`),
  },
  warehouses: {
    list: (p?: PaginationParams) => {
      const q = new URLSearchParams();
      if (p?.search) q.set('search', p.search);
      return apiClient.get<MastWarehouse[]>(`/api/master/warehouses?${q}`);
    },
    create: (data: Omit<MastWarehouse, 'id' | 'createDate' | 'updateDate'>) =>
      apiClient.post<MastWarehouse>('/api/master/warehouses', data),
    update: (id: number, data: Partial<MastWarehouse>) =>
      apiClient.put<MastWarehouse>(`/api/master/warehouses/${id}`, data),
    remove: (id: number) => apiClient.delete<{ id: number }>(`/api/master/warehouses/${id}`),
  },
  locations: {
    list: (p?: PaginationParams) => {
      const q = new URLSearchParams();
      if (p?.search) q.set('search', p.search);
      return apiClient.get<MastLocation[]>(`/api/master/locations?${q}`);
    },
    create: (data: Omit<MastLocation, 'id' | 'createDate' | 'updateDate'>) =>
      apiClient.post<MastLocation>('/api/master/locations', data),
    update: (id: number, data: Partial<MastLocation>) =>
      apiClient.put<MastLocation>(`/api/master/locations/${id}`, data),
    remove: (id: number) => apiClient.delete<{ id: number }>(`/api/master/locations/${id}`),
  },
  uoms: {
    list: () => apiClient.get<MastUom[]>('/api/master/uom'),
    create: (data: Omit<MastUom, 'id' | 'createDate' | 'updateDate'>) =>
      apiClient.post<MastUom>('/api/master/uom', data),
    update: (id: number, data: Partial<MastUom>) =>
      apiClient.put<MastUom>(`/api/master/uom/${id}`, data),
    remove: (id: number) => apiClient.delete<{ id: number }>(`/api/master/uom/${id}`),
  },
  vendors: {
    list: (p?: PaginationParams) => {
      const q = new URLSearchParams();
      if (p?.search) q.set('search', p.search);
      return apiClient.get<MastVendor[]>(`/api/master/vendors?${q}`);
    },
    create: (data: Omit<MastVendor, 'id' | 'createDate' | 'updateDate'>) =>
      apiClient.post<MastVendor>('/api/master/vendors', data),
    update: (id: number, data: Partial<MastVendor>) =>
      apiClient.put<MastVendor>(`/api/master/vendors/${id}`, data),
    remove: (id: number) => apiClient.delete<{ id: number }>(`/api/master/vendors/${id}`),
  },
  customers: {
    list: (p?: PaginationParams) => {
      const q = new URLSearchParams();
      if (p?.search) q.set('search', p.search);
      return apiClient.get<MastCustomer[]>(`/api/master/customers?${q}`);
    },
    create: (data: Omit<MastCustomer, 'id' | 'createDate' | 'updateDate'>) =>
      apiClient.post<MastCustomer>('/api/master/customers', data),
    update: (id: number, data: Partial<MastCustomer>) =>
      apiClient.put<MastCustomer>(`/api/master/customers/${id}`, data),
    remove: (id: number) => apiClient.delete<{ id: number }>(`/api/master/customers/${id}`),
  },
};


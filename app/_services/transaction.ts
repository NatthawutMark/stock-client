import type {
    DocReceive, DocReceiveDetail, DocIssue, DocIssueDetail,
    DocTransfer, DocRequest, DocDisposal, PaginationParams,
    DocTrans,
} from '@/lib/types';
import { apiClient } from '@/lib/api/client';

export const transactionService = {
    docTrans: {
        list: (data?: DocTrans) => apiClient.post<DocTrans[]>('/api/doctrans/list', data),
    },
    receive: {
        list: (p?: PaginationParams & { docNo?: string; docDate?: string; menuId?: number | string }) => {
            const q = new URLSearchParams();
            if (p?.search) q.set('search', p.search);
            if (p?.docNo) q.set('docNo', p.docNo);
            if (p?.docDate) q.set('docDate', p.docDate);
            if (p?.menuId) q.set('menuId', String(p.menuId));
            return apiClient.get<DocReceive[]>(`/api/transactions/receive?${q}`);
        },
        listItem: (data?: DocReceiveDetail) => apiClient.post('api/docreceive/list', data),
        get: (id: string | number) =>
            apiClient.get<DocReceive & { details: DocReceiveDetail[] }>(`/api/docreceive/${id}`),
        create: (data: unknown) =>
            apiClient.post<unknown>('/api/doctrans/create', data),
        update: (id: string, data: unknown) =>
            apiClient.put<DocReceive>(`/api/docreceive/${id}`, data),
        confirm: (id: string) =>
            apiClient.post<DocReceive>(`/api/docreceive/${id}/confirm`),
        putaway: (id: string) =>
            apiClient.post<DocReceive>(`/api/docreceive/${id}/putaway`),
    },
    issue: {
        list: (p?: PaginationParams & { docNo?: string; docDate?: string; menuId?: number | string }) => {
            const q = new URLSearchParams();
            if (p?.search) q.set('search', p.search);
            if (p?.docNo) q.set('docNo', p.docNo);
            if (p?.docDate) q.set('docDate', p.docDate);
            if (p?.menuId) q.set('menuId', String(p.menuId));
            return apiClient.get<DocIssue[]>(`/api/transactions/issue?${q}`);
        },
        listItem: (data?: Partial<DocIssueDetail>) => apiClient.post('/api/docissue/list', data),
        get: (id: string | number) =>
            apiClient.get<DocIssue & { details: DocIssueDetail[] }>(`/api/docissue/${id}`),
        create: (data: unknown) =>
            apiClient.post<unknown>('/api/doctrans/create', data),
        update: (id: string | number, data: unknown) =>
            apiClient.put<DocIssue>(`/api/docissue/${id}`, data),
        confirm: (id: string | number) =>
            apiClient.post<DocIssue>(`/api/docissue/${id}/confirm`),
        picking: (id: string | number) =>
            apiClient.post<DocIssue>(`/api/docissue/${id}/picking`),
    },
    transfer: {
        list: (p?: PaginationParams) => {
            const q = new URLSearchParams();
            if (p?.search) q.set('search', p.search);
            return apiClient.get<DocTransfer[]>(`/api/transactions/transfer?${q}`);
        },
        create: (data: Omit<DocTransfer, 'id' | 'createDate' | 'updateDate'>) =>
            apiClient.post<DocTransfer>('/api/transactions/transfer', data),
        update: (id: number, data: Partial<DocTransfer>) =>
            apiClient.put<DocTransfer>(`/api/transactions/transfer/${id}`, data),
    },
    request: {
        list: (p?: PaginationParams) => {
            const q = new URLSearchParams();
            if (p?.search) q.set('search', p.search);
            return apiClient.get<DocRequest[]>(`/api/transactions/request?${q}`);
        },
        create: (data: Omit<DocRequest, 'id' | 'createDate' | 'updateDate'>) =>
            apiClient.post<DocRequest>('/api/transactions/request', data),
        update: (id: number, data: Partial<DocRequest>) =>
            apiClient.put<DocRequest>(`/api/transactions/request/${id}`, data),
    },
    disposal: {
        list: (p?: PaginationParams) => {
            const q = new URLSearchParams();
            if (p?.search) q.set('search', p.search);
            return apiClient.get<DocDisposal[]>(`/api/transactions/disposal?${q}`);
        },
        create: (data: Omit<DocDisposal, 'id' | 'createDate' | 'updateDate'>) =>
            apiClient.post<DocDisposal>('/api/transactions/disposal', data),
        update: (id: number, data: Partial<DocDisposal>) =>
            apiClient.put<DocDisposal>(`/api/transactions/disposal/${id}`, data),
    },
};


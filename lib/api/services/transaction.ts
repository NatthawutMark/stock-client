import type {
    DocReceive, DocReceiveDetail, DocIssue, DocIssueDetail,
    DocTransfer, DocRequest, DocDisposal, PaginationParams,
} from '../../types';
import { apiClient } from '../client';

export const transactionService = {
    receive: {
        list: (p?: PaginationParams) => {
            const q = new URLSearchParams();
            if (p?.search) q.set('search', p.search);
            return apiClient.get<DocReceive[]>(`/api/transactions/receive?${q}`);
        },
        get: (id: number) => apiClient.get<DocReceive & { details: DocReceiveDetail[] }>(`/api/transactions/receive/${id}`),
        create: (data: Omit<DocReceive, 'id' | 'createDate' | 'updateDate'> & { details: Omit<DocReceiveDetail, 'id' | 'docId' | 'createDate' | 'updateDate'>[] }) =>
            apiClient.post<DocReceive>('/api/transactions/receive', data),
        update: (id: number, data: Partial<DocReceive>) =>
            apiClient.put<DocReceive>(`/api/transactions/receive/${id}`, data),
        approve: (id: number) =>
            apiClient.post<DocReceive>(`/api/transactions/receive/${id}/approve`, {}),
    },
    issue: {
        list: (p?: PaginationParams) => {
            const q = new URLSearchParams();
            if (p?.search) q.set('search', p.search);
            return apiClient.get<DocIssue[]>(`/api/transactions/issue?${q}`);
        },
        get: (id: number) => apiClient.get<DocIssue & { details: DocIssueDetail[] }>(`/api/transactions/issue/${id}`),
        create: (data: Omit<DocIssue, 'id' | 'createDate' | 'updateDate'> & { details: Omit<DocIssueDetail, 'id' | 'docId' | 'createDate' | 'updateDate'>[] }) =>
            apiClient.post<DocIssue>('/api/transactions/issue', data),
        update: (id: number, data: Partial<DocIssue>) =>
            apiClient.put<DocIssue>(`/api/transactions/issue/${id}`, data),
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


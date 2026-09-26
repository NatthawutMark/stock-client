import axios, { AxiosError } from 'axios';
import { config } from '@/lib/config';
import type { ApiResponse } from '../types';

const API_IP = process.env.NEXT_PUBLIC_API_IP;
const API_PORT = process.env.NEXT_PUBLIC_API_PORT;

const BASE_URL = API_IP && API_PORT 
  ? `${API_IP}:${API_PORT}` 
  : '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// สร้าง Axios Instance
const instance = axios.create({
  baseURL: config.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor จัดการ Error รวมจาก API
instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? error.message ?? 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    console.log('API Error:', status, config.api.baseUrl);
    return Promise.reject(new ApiError(status, message));
  }
);

export const apiClient = {
  get: async <T>(url: string, params?: Record<string, unknown>) => {
    const res = await instance.get<ApiResponse<T>>(url, { params });
    return res.data;
  },

  post: async <T>(url: string, body?: unknown) => {
    const res = await instance.post<ApiResponse<T>>(url, body);
    return res.data;
  },

  put: async <T>(url: string, body?: unknown) => {
    const res = await instance.put<ApiResponse<T>>(url, body);
    return res.data;
  },

  delete: async <T>(url: string, params?: Record<string, unknown>) => {
    const res = await instance.delete<ApiResponse<T>>(url, { params });
    return res.data;
  },
};
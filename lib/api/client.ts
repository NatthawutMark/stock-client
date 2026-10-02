import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/lib/types';

// อ่าน Base URL จาก Environment Variable ของ Next.js Client Side
const API_IP = process.env.NEXT_PUBLIC_API_IP;
const API_PORT = process.env.NEXT_PUBLIC_API_PORT;

const BASE_URL = API_IP && API_PORT ? `${API_IP}:${API_PORT}` : '';

// ==========================================
// Types & Interfaces
// ==========================================
interface RefreshTokenResponse {
    accessToken: string;
    refreshToken?: string;
}

interface QueueItem {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}

interface TokenData {
    accessToken: string;
    refreshToken: string;
}

// ==========================================
// Variables for Concurrent Request Handling
// ==========================================
let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else if (token) {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

// ==========================================
// Helper functions for LocalStorage
// ==========================================
const getStoredTokens = (): TokenData | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('wms-token');
    if (!raw) return null;
    try {
        return JSON.parse(raw) as TokenData;
    } catch {
        return null;
    }
};

const getStoredAccessToken = (): string | null => {
    return getStoredTokens()?.accessToken || null;
};

const getStoredRefreshToken = (): string | null => {
    return getStoredTokens()?.refreshToken || null;
};

// const setStoredTokens = (accessToken: string, refreshToken?: string) => {
//     if (typeof window === 'undefined') return;
//     localStorage.setItem('wms-token', JSON.stringify(accessToken));
//     if (refreshToken) {
//         localStorage.setItem('wms-refresh-token', refreshToken);
//     }
// };
const setStoredTokens = (accessToken: string, refreshToken?: string) => {
    if (typeof window === 'undefined') return;

    // ดึงของเก่ามาเผื่อกรณีที่ API Refresh ไม่ได้ส่ง refreshToken ตัวใหม่มาให้ จะได้ใช้ตัวเดิมต่อ
    const currentTokens = getStoredTokens();
    const newTokens = {
        accessToken,
        refreshToken: refreshToken || currentTokens?.refreshToken || '',
    };

    localStorage.setItem('wms-token', JSON.stringify(newTokens));
};

const clearAuthAndRedirect = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('wms-token');
    // localStorage.removeItem('wms-user');
    window.location.href = '/login';
};

// ==========================================
// Create Axios Instance
// ==========================================
const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// ==========================================
// 1. Request Interceptor
// ==========================================
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {

        const token = getStoredAccessToken();

        if (!token && !config.url?.includes('/auth/login')) {
            clearAuthAndRedirect();
            window.location.href = '/login';
            return Promise.reject(new Error('No token found in localStorage'));
        }

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ==========================================
// 2. Response Interceptor (Direct External Backend Refresh)
// ==========================================
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (!error.response || error.response.status !== 401 || !originalRequest) {
            return Promise.reject(error);
        }

        // ป้องกัน Loop กรณีที่เส้น API ขอ Token ใหม่พังซะเอง
        if (originalRequest.url?.includes('/api/auth/refresh') || originalRequest._retry) {
            clearAuthAndRedirect();
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((newToken) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    }
                    return axiosInstance(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = getStoredRefreshToken();
        // **จุดสังเกต:** ถ้าฝั่ง C# ของคุณต้องใช้ Access Token เก่าคู่กับ Refresh Token ด้วย ให้ดึงมาส่งไปพร้อมกัน
        // const accessToken = getStoredAccessToken(); 

        if (!refreshToken) {
            isRefreshing = false;
            clearAuthAndRedirect();
            return Promise.reject(error);
        }

        try {
            const response = await axios.post<ApiResponse<RefreshTokenResponse> | RefreshTokenResponse>(
                `${BASE_URL}/api/auth/refresh`,
                { refreshToken }, // ถ้า C# ขอ accessToken ด้วย ให้แก้เป็น { accessToken, refreshToken }
                { headers: { 'Content-Type': 'application/json' } }
            );

            const responseData = response.data;
            const tokenData = ('data' in responseData && responseData.data)
                ? responseData.data
                : (responseData as RefreshTokenResponse);

            const newAccessToken = tokenData?.accessToken;
            const newRefreshToken = tokenData?.refreshToken;

            if (newAccessToken) {
                setStoredTokens(newAccessToken, newRefreshToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }

                processQueue(null, newAccessToken);
                return axiosInstance(originalRequest);
            } else {
                throw new Error('Invalid refresh token response');
            }
        } catch (refreshError) {
            processQueue(refreshError, null);
            clearAuthAndRedirect();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

// ==========================================
// Export ApiClient Wrapper
// ==========================================
export const apiClient = {
    get: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        const res = await axiosInstance.get<ApiResponse<T>>(url, config);
        return res.data;
    },

    post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        const res = await axiosInstance.post<ApiResponse<T>>(url, data, config);
        return res.data;
    },

    put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        const res = await axiosInstance.put<ApiResponse<T>>(url, data, config);
        return res.data;
    },

    delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
        const res = await axiosInstance.delete<ApiResponse<T>>(url, config);
        return res.data;
    },
};
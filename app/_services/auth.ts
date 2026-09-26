import type { LoginRequest, LoginResponse } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

export const authService = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/auth/login', data),

  getProfile: () =>
    apiClient.get<LoginResponse['user']>('/api/auth/profile'),
};


import type { LoginRequest, LoginResponse } from '../../types';
import { apiClient } from '../client';

export const authService = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/auth/login', data),

  getProfile: () =>
    apiClient.get<LoginResponse['user']>('/api/auth/profile'),
};


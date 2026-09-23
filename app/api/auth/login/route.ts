import { users } from '@/lib/mock/data';
import type { ApiResponse, LoginResponse } from '@/lib/types';

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const found = users.find(u => u.username === username && u.password === password);

  if (!found) {
    return Response.json({ success: false, data: null, message: 'Invalid credentials' }, { status: 401 });
  }

  const { password: _pw, ...user } = found;
  const response: LoginResponse = {
    token: `mock-token-${user.id}-${Date.now()}`,
    user: {
      ...user,
      username: user.username,
      role: user.role,
      isAdmin: user.isAdmin,
    },
  };

  return Response.json({ success: true, data: response } satisfies ApiResponse<LoginResponse>);
}


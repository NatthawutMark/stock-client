export const config = {
  api: {
    ip: process.env.NEXT_PUBLIC_API_IP ?? 'http://127.0.0.1',
    port: process.env.NEXT_PUBLIC_API_PORT ?? '3000',
    get baseUrl() {
      return `${this.ip}:${this.port}`;
    },
  },
  isDev: process.env.NODE_ENV === 'development',
} as const;
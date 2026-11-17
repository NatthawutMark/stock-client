export const config = {
    api: {
        ip: process.env.NEXT_PUBLIC_API_IP ?? '',
        port: process.env.NEXT_PUBLIC_API_PORT ?? '',
        get baseUrl() {
            return this.ip && this.port ? `${this.ip}:${this.port}` : this.ip;
        },
    },
    isDev: process.env.NODE_ENV === 'development',
} as const;

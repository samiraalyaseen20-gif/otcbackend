export interface User {
    id: number;
    name: string;
    username: string;
    email?: string;
    email_verified_at?: string | null;
    role: 'admin' | 'employee';
    status: 'active' | 'inactive';
    created_at?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash?: {
        success?: string;
        error?: string;
    };
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  companyId?: string;
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};

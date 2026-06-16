export type AuthUser = {
  id: string;
  name: string;
  email: string;
  companyId?: string | null;
  impersonatedCompanyId?: string | null;
  isImpersonating?: boolean;
  accessLevel: "PLATFORM" | "COMPANY";
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};

export type AccessTokenPayload = {
  sub: string;
  impersonationId?: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: "refresh";
};

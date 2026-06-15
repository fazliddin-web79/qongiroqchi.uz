export type AuthUser = {
  id: string;
  name: string;
  email: string;
  companyId?: string | null;
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};

export type AccessTokenPayload = {
  sub: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: "refresh";
};

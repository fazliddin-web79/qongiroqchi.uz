export const authConfig = {
  accessCookie: "autocall-access-token",
  refreshCookie: "autocall-refresh-token",
  protectedRoutes: ["/dashboard"],
  loginRoute: "/login",
  accessTokenLifetime: "15m",
  refreshTokenLifetime: "30d",
  accessTokenMaxAge: 15 * 60,
  refreshTokenMaxAge: 30 * 24 * 60 * 60,
} as const;

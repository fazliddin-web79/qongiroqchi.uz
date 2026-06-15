export const authConfig = {
  sessionCookie: "autocall-session",
  protectedRoutes: ["/dashboard"],
  loginRoute: "/login",
  tokenLifetime: "7d",
} as const;

import { DashboardOverview } from "@/components/pages/dashboard-overview";
import { PlatformDashboardOverview } from "@/components/pages/platform-dashboard-overview";
import { requireAuth } from "@/lib/auth/service";
export default async function Page() {
  const { user } = await requireAuth();
  return user.accessLevel === "PLATFORM" && !user.isImpersonating ? <PlatformDashboardOverview /> : <DashboardOverview />;
}

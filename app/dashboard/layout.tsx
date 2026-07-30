import { redirect } from "next/navigation";
import { getSessionFromRequest } from "@/lib/auth/middleware";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  // Import NextRequest from next/server
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("reservex_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const { verifySession } = await import("@/lib/auth/jwt");
  const user = await verifySession(token);

  if (!user) {
    redirect("/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

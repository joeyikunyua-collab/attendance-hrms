import { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import api from "@/lib/axios";
import SetPasswordModal from "@/components/SetPasswordModal";
import NotificationBell from "@/components/NotificationBell";
import { useCheckInReminder } from "@/lib/useCheckInReminder";
import type { AuthUser } from "@/types";

interface LayoutProps {
  user: AuthUser | null;
  children: ReactNode;
}

export default function Layout({ user, children }: LayoutProps) {
  const router = useRouter();
  useCheckInReminder(user);

  async function handleLogout() {
    await api.post("/auth/logout");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="font-semibold text-slate-800">
            Attendance
          </Link>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-slate-500">{user.name}</span>}
            {user && <NotificationBell />}
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-600"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      <SetPasswordModal isOpen={!!user?.mustChangePassword} />
    </div>
  );
}

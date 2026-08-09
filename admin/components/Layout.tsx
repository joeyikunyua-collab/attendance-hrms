import { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Building2 } from "lucide-react";
import SetPasswordModal from "@/components/SetPasswordModal";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import { useCheckInReminder } from "@/lib/useCheckInReminder";
import { useSettings } from "@/lib/SettingsContext";
import { ADMIN_NAV_LINKS, STAFF_NAV_LINKS } from "@/lib/navLinks";
import type { AuthUser } from "@/types";

interface LayoutProps {
  user: AuthUser | null;
  children: ReactNode;
}

export default function Layout({ user, children }: LayoutProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings } = useSettings();
  useCheckInReminder(user);

  const navLinks = user?.role === "admin" ? ADMIN_NAV_LINKS : STAFF_NAV_LINKS;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        {/* Row 1: branding + user chrome */}
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
            {settings.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.companyLogoUrl}
                alt={settings.companyName}
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-[18px] h-[18px]" />
              </div>
            )}
            <span className="font-semibold text-slate-800 truncate">{settings.companyName}</span>
          </Link>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {user && <NotificationBell />}
            {user && <ProfileMenu user={user} onOpenSettings={() => setSettingsOpen(true)} />}
          </div>
        </div>

        {/* Row 2: sub-navigation - the single source of truth for section links */}
        {user && (
          <div className="max-w-6xl mx-auto px-4">
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto -mb-px">
              {navLinks.map((link) => {
                const isActive = router.pathname === link.href;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      isActive
                        ? "border-blue-600 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>

      <SetPasswordModal
        isOpen={!!user?.mustChangePassword || settingsOpen}
        onClose={user?.mustChangePassword ? undefined : () => setSettingsOpen(false)}
      />
    </div>
  );
}

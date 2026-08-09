import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import SettingsPanel from "@/components/panels/SettingsPanel";
import { useAuth } from "@/lib/useAuth";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  if (loading || !user || user.role !== "admin") return null;

  return (
    <Layout user={user}>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Configure system-wide behavior and branding.</p>
      <SettingsPanel />
    </Layout>
  );
}

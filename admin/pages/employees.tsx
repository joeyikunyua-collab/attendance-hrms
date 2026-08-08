import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import EmployeesPanel from "@/components/panels/EmployeesPanel";
import { useAuth } from "@/lib/useAuth";

export default function EmployeesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  if (loading || !user || user.role !== "admin") return null;

  return (
    <Layout user={user}>
      <EmployeesPanel />
    </Layout>
  );
}

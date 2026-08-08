import Layout from "@/components/Layout";
import ReportsPanel from "@/components/panels/ReportsPanel";
import { useAuth } from "@/lib/useAuth";

export default function ReportsPage() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;

  return (
    <Layout user={user}>
      <ReportsPanel user={user} />
    </Layout>
  );
}

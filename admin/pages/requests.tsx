import Layout from "@/components/Layout";
import RequestsPanel from "@/components/panels/RequestsPanel";
import { useAuth } from "@/lib/useAuth";

export default function RequestsPage() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;

  return (
    <Layout user={user}>
      <RequestsPanel user={user} />
    </Layout>
  );
}

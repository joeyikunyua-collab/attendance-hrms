import Layout from "@/components/Layout";
import AttendancePanel from "@/components/panels/AttendancePanel";
import { useAuth } from "@/lib/useAuth";

export default function AttendancePage() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;

  return (
    <Layout user={user}>
      <AttendancePanel user={user} />
    </Layout>
  );
}

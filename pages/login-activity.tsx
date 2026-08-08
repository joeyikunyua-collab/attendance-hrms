import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import LoginActivityPanel from "@/components/panels/LoginActivityPanel";
import { useAuth } from "@/lib/useAuth";

export default function LoginActivityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  if (loading || !user || user.role !== "admin") return null;

  return (
    <Layout user={user}>
      <LoginActivityPanel />
    </Layout>
  );
}

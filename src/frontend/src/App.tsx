import { AuthenticatedApp } from "@/components/InternetIdentity";
import { Layout } from "@/components/Layout";
import { VaultSessionProvider } from "@/hooks/useVaultSession";
import VaultWorkspace from "@/pages/VaultWorkspace";

export default function App() {
  return (
    <AuthenticatedApp
      title="dPassword"
      description="Your zero-knowledge vault. Sign in with Internet Identity to unlock your encrypted notes and passwords."
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground"
      buttonClassName="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-subtle transition-smooth hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
    >
      <VaultSessionProvider>
        <Layout>
          <VaultWorkspace />
        </Layout>
      </VaultSessionProvider>
    </AuthenticatedApp>
  );
}

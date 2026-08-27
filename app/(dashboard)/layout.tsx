import { DashboardShell } from '@/components/dashboard-shell';
import { SimulationBanner } from '@/components/simulation-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SimulationBanner />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}

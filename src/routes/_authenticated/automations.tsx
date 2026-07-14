import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/automations")({
  component: () => (
    <StubPage
      title="Automações"
      description="Workflows n8n conectados ao InsightOS."
      icon={Workflow}
      message="Aqui você verá o status dos workflows n8n por cliente e fonte de dados."
    />
  ),
});

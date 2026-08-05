import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/ai-insights")({
  component: () => (
    <StubPage
      title="Módulo Analítico Avançado"
      description="Projeções preditivas e planos de ação consolidados para alta direção."
      icon={BarChart3}
      message="Disponível na próxima atualização de performance."
    />
  ),
});

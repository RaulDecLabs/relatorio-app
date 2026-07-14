import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/ai-insights")({
  component: () => (
    <StubPage
      title="IA Insights"
      description="Análises automáticas e planos de ação gerados por IA."
      icon={Sparkles}
      message="Disponível na Fase 4 do roadmap. Geração on-demand via Lovable AI Gateway."
    />
  ),
});

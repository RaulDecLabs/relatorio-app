import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/costs")({
  component: () => (
    <StubPage
      title="Custos"
      description="Consumo de IA, integrações e infraestrutura."
      icon={Wallet}
      message="Painel de custos em construção. Acompanhará uso do Lovable AI Gateway e n8n."
    />
  ),
});

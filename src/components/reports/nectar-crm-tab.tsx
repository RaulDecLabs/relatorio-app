import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, ShieldAlert, CheckCircle2 } from "lucide-react";
import { SectionTitle, ReportConfig } from "@/components/reports/report-ui";

interface NectarCrmTabProps {
  activeReport: ReportConfig;
  startDateStr: string;
  endDateStr: string;
}

export function NectarCrmTab({ activeReport, startDateStr, endDateStr }: NectarCrmTabProps) {
  const hasToken = !!activeReport?.nectar_api_token;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-card/80 to-purple-500/10 shadow-sm backdrop-blur-md">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-500 border border-blue-500/30 shadow-inner">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-foreground sm:text-base">Integração Nectar CRM</h4>
                {hasToken ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Token Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px]">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Token Pendente
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Oportunidades comerciais e funil de vendas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle 
        title="Nectar CRM" 
        description="Acompanhamento do funil de oportunidades comerciais." 
        icon={Target} 
        color="blue" 
      />

      <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mb-3">
          <Target className="h-6 w-6" />
        </div>
        <h4 className="text-base font-bold text-foreground">Aguardando Extração do Nectar CRM</h4>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1 mb-4">
          Para ver os dados aqui, precisamos rodar a rotina de extração da API para o período de {startDateStr} a {endDateStr}.
        </p>
        {!hasToken && (
           <p className="text-sm text-amber-500 font-semibold">
             Vá em "Configurar" lá no topo e insira o Token de API do Nectar CRM primeiro!
           </p>
        )}
      </Card>
    </div>
  );
}

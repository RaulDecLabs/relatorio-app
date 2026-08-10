import React from "react";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SheetsTabProps {
  sheetsAudit: any;
  isLoadingSheetsAudit: boolean;
  refetchSheetsAudit: () => void;
  dateRange: string;
  isClient: boolean;
}

export function SheetsTab({ 
  sheetsAudit, 
  isLoadingSheetsAudit, 
  refetchSheetsAudit, 
  dateRange, 
  isClient 
}: SheetsTabProps) {
  return (
    <div className="space-y-6">
      {/* Google Sheets Audit Section */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              Conciliação & Auditoria (Google Sheets)
            </CardTitle>
            <CardDescription>
              Cruzamento de dados entre conversões registradas no Google Ads vs. cadastros reais na planilha.
            </CardDescription>
          </div>
          {sheetsAudit?.ok && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1 bg-background/50" 
              onClick={() => refetchSheetsAudit()}
              disabled={isLoadingSheetsAudit}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoadingSheetsAudit && "animate-spin")} />
              Atualizar Planilha
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingSheetsAudit ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              Acessando Google Sheets...
            </div>
          ) : !sheetsAudit?.ok ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-muted/20">
              <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-medium text-foreground">
                {sheetsAudit?.error && sheetsAudit.error.includes("No sheet configured") 
                  ? "Nenhuma planilha vinculada para esta empresa" 
                  : (sheetsAudit?.error || "Erro ao carregar a planilha.")}
              </p>
              <p className="mt-1 text-xs">
                {isClient ? 
                  "Aguarde enquanto nossa equipe vincula a planilha de acompanhamento e auditoria de conversões do seu projeto." : 
                  "Para conectar o Google Sheets desta empresa, verifique a URL e as permissões de compartilhamento ('Qualquer pessoa com o link')."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Audit summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground font-medium">Contatos no Sheets ({dateRange === "yesterday" ? "Ontem" : `Últimos ${dateRange} dias`})</div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-600 font-mono">{sheetsAudit.count}</span>
                    <span className="text-xs text-muted-foreground">leads reais</span>
                  </div>
                </div>
              </div>

              {/* Sample rows */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span>Amostra de cadastros (Últimas linhas do Sheets no período)</span>
                  <Badge variant="outline" className="text-[10px] py-0 font-normal">
                    Coluna de Data: "{sheetsAudit.date_column_detected}"
                  </Badge>
                </h4>
                {sheetsAudit.sample_rows?.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/10">
                    Nenhum cadastro encontrado nesta planilha para o período selecionado.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-xs py-2 pl-4">Data</TableHead>
                          <TableHead className="text-xs py-2">Nome / Contato</TableHead>
                          <TableHead className="text-xs py-2">E-mail / Telefone</TableHead>
                          <TableHead className="text-xs py-2 pr-4 text-right">Origem / Canal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheetsAudit.sample_rows.map((row: any, idx: number) => {
                          const dateKey = Object.keys(row).find(k => k.includes('data') || k.includes('date') || k.includes('time') || k.includes('timestamp')) || '';
                          const nameKey = Object.keys(row).find(k => k.includes('nome') || k.includes('name') || k.includes('cliente') || k.includes('contato')) || '';
                          const emailKey = Object.keys(row).find(k => k.includes('email') || k.includes('e-mail') || k.includes('mail') || k.includes('telefone') || k.includes('phone') || k.includes('celular')) || '';
                          const sourceKey = Object.keys(row).find(k => k.includes('origem') || k.includes('source') || k.includes('utm') || k.includes('canal')) || '';

                          return (
                            <TableRow key={idx} className="hover:bg-muted/10">
                              <TableCell className="text-xs py-2.5 pl-4 font-mono">{row[dateKey] || '—'}</TableCell>
                              <TableCell className="text-xs py-2.5 font-medium">{row[nameKey] || '—'}</TableCell>
                              <TableCell className="text-xs py-2.5 text-muted-foreground">{row[emailKey] || '—'}</TableCell>
                              <TableCell className="text-xs py-2.5 text-right pr-4 font-semibold text-primary">{row[sourceKey] || 'Google Ads (Planilha)'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

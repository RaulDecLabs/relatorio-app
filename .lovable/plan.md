
# InsightOS — Plano MVP (V1) com Decsigner como cliente piloto

Vamos focar em entregar **valor real com 1 cliente e 2 fontes de dados**, e construir a estrutura para escalar. Abaixo: arquitetura, escolha das fontes, papel do n8n, e o roadmap em fases com um **painel interno de checklist (Kanban + cronograma)** acessível só pelo seu usuário.

---

## 1. Arquitetura escolhida (e por quê)

```text
[Fontes de dados]  →  [n8n (ETL/orquestração)]  →  [Lovable Cloud / Postgres = Data Warehouse]  →  [InsightOS UI + IA]
   Google Sheets         normaliza + agenda           tabelas fato (metrics_daily)              dashboards, insights
   Google Ads            push autenticado              tabelas dimensão (clients, sources)       relatórios, IA
```

**Por que n8n como hub:**
- Cada fonte (Google Ads, Meta Ads, GA4, RD Station…) tem OAuth/API diferente. Implementar cada uma nativamente no Lovable = meses de trabalho + manutenção de tokens.
- n8n já tem **nodes prontos** para todas as fontes do seu PRD (Sheets, Ads, GA4, Search Console, Meta, RD, Mailchimp/RD Mail).
- n8n cuida de: autenticação, refresh de tokens, agendamento (cron), retries, transformação.
- InsightOS expõe **1 único endpoint público seguro** (`/api/public/ingest`) que recebe dados normalizados. Adicionar uma nova fonte = criar um workflow no n8n, não mexer no código do app.

**Data Warehouse:** uma tabela `metrics_daily` (cliente, fonte, data, métrica, valor) + `metrics_raw` (JSONB do payload original para auditoria). Simples, agregável, escalável.

---

## 2. Qual conta do n8n usar

**Recomendação:** **n8n Cloud** (plano Starter ~€20/mês) no início.
- Sem servidor para gerenciar, OAuth dos Google products já funciona out-of-the-box.
- Quando passar de ~5 clientes ou precisar de mais workflows, migra para **n8n self-hosted** (Docker em VPS Hetzner/DigitalOcean, ~$6/mês) — mesma interface, sem limite de execuções.

**Conta única da agência** (não uma por cliente). Os workflows referenciam o `client_id` do InsightOS, e cada fonte de dados do cliente é uma **credential** separada dentro do n8n.

---

## 3. Escolha das 2 fontes para o MVP

| Fonte | Dificuldade | Valor entregue | Decisão |
|---|---|---|---|
| **Google Sheets (Leads)** | ⭐ Baixa | Alto — entra na 1ª semana | ✅ MVP |
| **Google Ads** | ⭐⭐ Média | Alto — mostra ROAS, CPL | ✅ MVP |
| GA4 | ⭐⭐⭐ Alta (schema complexo) | Médio | Fase 2 |
| Meta Ads | ⭐⭐⭐ Alta (review da Meta) | Alto | Fase 2 |
| Search Console | ⭐⭐ Média | Médio | Fase 3 |
| RD Station | ⭐⭐ Média | Alto p/ Decsigner se usar | Fase 3 |

**Sheets + Google Ads** = cobre o caso clássico: "quanto investi vs. quantos leads gerei vs. CPL".

---

## 4. Como o cliente (Decsigner) vai ver

- **Dashboard do cliente** (`/clients/decsigner`): KPIs do mês (investimento, leads, CPL, ROAS), gráfico de evolução diária, tabela de campanhas Google Ads, lista de leads do Sheets com status.
- **Aba Insights IA**: resumo automático ("Investimento subiu 18% mas CPL caiu 12% — campanha X está performando 3x melhor que Y"). Gerado on-demand via Lovable AI Gateway.
- **Aba Fontes**: status de cada conexão (verde/amarelo/vermelho), última sincronização, botão "Sincronizar agora" (dispara webhook do n8n).

---

## 5. Como conectar as fontes de forma simples e segura

Fluxo padrão para o admin (você) conectar uma fonte de um cliente:

1. No InsightOS: `Clientes → Decsigner → Integrações → Conectar Google Ads`.
2. O app gera um **token de integração único** (`integration_id` + `secret`) e mostra um **deeplink para o n8n**.
3. No n8n: você abre o workflow template "Google Ads → InsightOS", cola o token, conecta sua credencial Google Ads e ativa.
4. n8n roda diariamente, busca os dados, e faz POST para `https://insightos.app/api/public/ingest` com:
   ```json
   { "integration_id": "...", "secret": "...", "source": "google_ads",
     "client_id": "...", "data": [...] }
   ```
5. InsightOS valida o secret (HMAC), normaliza e grava em `metrics_daily`.

**Segurança:**
- Secrets nunca expostos no frontend (gerados server-side).
- Endpoint público com verificação HMAC + rate limit.
- RLS no Postgres garante que cada agência só vê seus próprios dados.
- Tokens OAuth ficam **dentro do n8n** — InsightOS nunca toca em credenciais Google/Meta.

---

## 6. Roadmap em fases (MVP → V1 → V2)

### **Fase 0 — Pendências da fundação** (esta sprint, ~2h)
- [ ] Esconder cadastro público no `/auth` (só login; criação de usuário só pelo admin)
- [ ] Página `/users` (criar/listar/remover usuários, atribuir papéis admin/agency/client)
- [ ] Página `/settings` (perfil + preferências básicas)
- [ ] Páginas stub: `/reports`, `/ai-insights`, `/integrations`, `/templates`, `/automations`, `/costs`
- [ ] **Página `/roadmap`** — Kanban + checklist + barra de progresso (acesso só admin)

### **Fase 1 — Data Warehouse + Ingest** (sprint 1)
- [ ] Tabelas `data_sources`, `metrics_daily`, `metrics_raw`, `ingest_logs`
- [ ] Endpoint público `/api/public/ingest` com HMAC + Zod
- [ ] Geração de `integration_id`/`secret` por cliente+fonte
- [ ] Página `/clients/$id/integrations` com status e "Sincronizar agora"

### **Fase 2 — Google Sheets (primeira fonte real)** (sprint 2)
- [ ] Cadastrar Decsigner como cliente
- [ ] Workflow n8n: ler planilha de leads → POST para `/api/public/ingest`
- [ ] Tab "Leads" no dashboard do cliente (tabela + filtros + status)
- [ ] Documento markdown com passo-a-passo para replicar o workflow

### **Fase 3 — Google Ads (segunda fonte)** (sprint 3)
- [ ] Workflow n8n Google Ads → ingest (campanhas, gasto, cliques, conversões)
- [ ] Dashboard Decsigner: KPIs (gasto, CPL, ROAS), gráfico diário, tabela de campanhas

### **Fase 4 — IA Insights** (sprint 4)
- [ ] Server function `generateInsight(clientId, period)` usando Lovable AI Gateway
- [ ] Botão "Gerar análise" na tela do cliente, salva em `ai_insights`
- [ ] Histórico de insights

### **Fase 5 — Relatórios** (sprint 5)
- [ ] Export PDF do dashboard do cliente
- [ ] Template básico com logo + KPIs + gráficos

### **V2 — depois do MVP validado**
- Fontes adicionais: GA4, Meta Ads, Search Console, RD Station, E-mail marketing
- White label, multi-agência, comentários, aprovação, forecast IA

---

## 7. Página interna de Roadmap (Kanban + Checklist)

Vou criar `/roadmap` com:
- **Acesso restrito** ao seu user (`daniel@decsigner.com.br`) via RLS.
- **Tabela `roadmap_items`**: `phase`, `title`, `status` (todo/doing/done), `order`, `notes`.
- **Visualização**:
  - Barra de progresso geral (% de itens `done`)
  - Progresso por fase
  - Vista Kanban (3 colunas) + vista Checklist
  - Clicar num item alterna status; histórico de quando foi marcado done
- Pré-populada com **todos os itens das Fases 0–5 acima**, então você acompanha tudo em tempo real conforme eu vou completando.

---

## 8. O que vou implementar AGORA (próxima mensagem, se aprovar)

1. Tabela `roadmap_items` + seed com os itens das fases
2. Página `/roadmap` (admin-only) com Kanban + checklist + progress bar
3. Esconder signup do `/auth` (apenas login)
4. Página `/users` para você criar os usuários da equipe/clientes
5. Stubs das demais páginas do menu para não ter mais 404
6. Cadastrar **Decsigner** como primeiro cliente (via UI ou seed)

Depois disso entramos na **Fase 1 (Data Warehouse + endpoint de ingest)** e te entrego o primeiro workflow n8n pronto pra colar.

---

**Aprova esse plano?** Se sim, mando ver direto no item 8.
Se quiser ajustar algo (ex: começar por outra fonte, mudar ordem das fases, adicionar/remover algo do checklist), me diz o que mudar.

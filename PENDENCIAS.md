# 📋 ROCKET CLUB — MAPA DE PENDÊNCIAS & GUIA DE RETOMADA
> **Data de Atualização:** 25/09/2026  
> **Branch Atual:** `feat/f6-bot-humanizado` (Commit `5c7de21`)  
> **Status Geral do Sistema:** ✅ Fases 1, 2 e 3 100% Implementadas e Validadas com Custo Zero

---

## 🚀 1. Status das Implementações Recentes

| Fase | Funcionalidade | Status | Detalhes Técnicos |
| :--- | :--- | :---: | :--- |
| **Fase 1** | **Rate Limiting em Memória** | ✅ Concluído | Janela deslizante (*sliding window*) sem Redis pago em `lib/auth/rate-limiter.ts` integrado em `app/api/auth/login/route.ts` (bloqueio por IP contra brute-force). |
| **Fase 1** | **Exportação PDF de SOPs** | ✅ Concluído | Botão *"Baixar PDF"* com estilização de impressão limpa em `app/(dashboard)/wiki/[id]/page.tsx`. |
| **Fase 2** | **Automações CRM WhatsApp & Hostinger** | ✅ Concluído | Disparo em `lib/crm/crm-automations.ts` ao mover deals: aciona Evolution API, Webhook Hostinger/n8n (`HOSTINGER_WEBHOOK_URL`) e SSE. |
| **Fase 2** | **Notificações em Tempo Real (SSE Nativo)** | ✅ Concluído | Streaming nativo de eventos (`/api/notifications/stream`) sem custos com Pusher/Ably em `lib/notifications-stream.ts` e `lib/notification-context.tsx`. |
| **Fase 3** | **Página Pública de Agendamento 1-on-1** | ✅ Concluído | Interface pública em `/agendar` + endpoint `/api/agendar` com seleção de data/hora, link pro Google Calendar e alertas automáticos. |
| **Fase 3** | **Diagnóstico Estratégico IA 360°** | ✅ Concluído | Motor de IA em `lib/ai/mentee-diagnosis.ts` integrado no `components/mentee-sheet.tsx` com dados reais do mentorado (score de saúde, churn, gargalos, roteiro 1-on-1 e entregáveis). |

---

## ⚙️ 2. Checklist de Variáveis de Ambiente para Produção

Para publicar em produção na **Vercel** ou na **Hostinger Cloud Starter**, preencha as variáveis de ambiente necessárias:

```env
# ==============================================================================
# 1. BANCO DE DADOS (Neon Serverless Postgres)
# ==============================================================================
DATABASE_URL="postgresql://..."

# ==============================================================================
# 2. AUTOMAÇÕES CRM & HOSTINGER CLOUD / N8N (100% Custo Zero)
# ==============================================================================
# URL do webhook configurado na sua Hostinger Cloud Starter ou n8n gratuito
HOSTINGER_WEBHOOK_URL="https://seu-dominio-hostinger.com.br/webhook/crm-deals"

# ==============================================================================
# 3. WHATSAPP (Evolution API)
# ==============================================================================
EVOLUTION_API_URL="https://sua-instancia-evolution.com"
EVOLUTION_API_KEY="sua_chave_evolution_aqui"
EVOLUTION_INSTANCE_NAME="rocket-club-crm"

# ==============================================================================
# 4. E-MAILS TRANSACIONAIS (Resend - Plano Gratuito 3.000 envios/mês)
# ==============================================================================
RESEND_API_KEY="re_..."
EMAIL_FROM="Rocket Club <notificacoes@rocketclub.com.br>"

# ==============================================================================
# 5. INTELIGÊNCIA ARTIFICIAL (Opcional para Copiloto do Inbox)
# ==============================================================================
GEMINI_API_KEY="AIzaSy..."
```

> 💡 **Nota:** Todos os serviços foram desenvolvidos com **fallback defensivo gracioso**. Se uma chave estiver ausente, o sistema não quebra: ele registra o aviso em log e continua funcionando.

---

## 🔀 3. Git & Deploy para Produção

- [x] **Revisão / Merge**: Realizado o merge da branch `feat/f6-bot-humanizado` para a branch principal `main` e validação da suite de testes.
- [x] **Limpeza de Testes Locais**: Pasta `tmp/` devidamente adicionada ao `.gitignore` e workspace protegido contra arquivos temporários.

---

## 🎯 4. Roadmap de Expansão (100% Implementado & Validado)

| Funcionalidade | Status | Detalhes da Entrega |
| :--- | :---: | :--- |
| **Sincronização 2-Way do Google Calendar** | ✅ Concluído | Módulo `lib/calendar/google-calendar.ts` + `/api/calendar/google/sync` + `/agendar` com geração dinâmica de links para agenda e Google Meet automático. |
| **Gateway de Pagamento & Checkout de Renovação** | ✅ Concluído | `/api/payments/checkout` e `/api/webhook/payments` integrados com Asaas (Pix Instantâneo) e Stripe (Cartão Global), além de `DealCheckoutModal` na ficha do mentorado e CRM. |
| **Player de Vídeo e Progresso no Rocket Academy** | ✅ Concluído | Controle dinâmico de porcentagem de conclusão de cursos, persistência em `/api/academy/progress`, atalhos de teclado no player e Certificado Oficial de Conclusão emitido em modal aos 100%. |
| **Relatórios Consolidados de Cohort e LTV** | ✅ Concluído | Matriz analítica de Cohort com heatmap de retenção M0-M12 em `components/financial/cohort-ltv-view.tsx`, cálculo executivo de LTV/CAC/Payback e exportação estruturada em CSV/Excel via `/api/reports/cohort`. |

---

## 💻 5. Como Retomar o Projeto Localmente

Ao reiniciar na segunda-feira:

1. **Iniciar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   # ou
   npx next dev -p 3001
   ```
2. **URLs Principais**:
   - **Painel Geral / Dashboard:** `http://localhost:3001`
   - **Gestão de Mentorados & Diagnóstico IA:** `http://localhost:3001/mentorados`
   - **CRM & Kanban de Oportunidades:** `http://localhost:3001/crm`
   - **Inbox & Copiloto WhatsApp:** `http://localhost:3001/inbox`
   - **Página Pública de Agendamento:** `http://localhost:3001/agendar`
   - **Wiki & SOPs Operacionais:** `http://localhost:3001/wiki`

3. **Verificação de Tipos TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

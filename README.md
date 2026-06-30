# Contrato Visto — Frontend

Frontend em Next.js + TypeScript do MVP local **Contrato Visto** (LegalTech). Consome o
backend **serverless** (AWS Lambda + API Gateway + PostgreSQL/RLS) que, em desenvolvimento,
roda via um dev-server local. Nesta fase não há Cognito, S3, SQS, OCR, IA/RAG ou e-mail
reais — os adapters do backend são mock-first e o deploy AWS é uma etapa posterior.

## Stack

- Next.js 16 (Turbopack) · React 19 · TypeScript
- Tailwind CSS · lucide-react (ícones)
- Testes: `node:test` via `tsx`

## Configuração local

Crie o `.env.local` a partir do exemplo:

```powershell
Copy-Item .env.example .env.local
```

Variáveis públicas (expostas no navegador — nunca coloque segredos):

```env
NEXT_PUBLIC_APP_NAME=Contrato Visto
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_ENABLE_API_MOCK_FALLBACK=true
```

O `next.config` reescreve `/api/v1/*` para `${NEXT_PUBLIC_API_BASE_URL}/api/v1/*`.
`NEXT_PUBLIC_ENABLE_API_MOCK_FALLBACK=true` deixa as telas usarem dados fictícios locais
quando o backend está fora; em `staging`/`prod` use `false`. O fallback nunca mascara
`401`/`403`/erros de validação — só falha de conexão.

## Instalar e rodar

```powershell
npm install
npm run dev   # http://localhost:3000
```

## Backend local (serverless dev-server)

O frontend conversa com o backend do repositório `contrato_visto_backend-main`. Resumo:

```powershell
# 1) Postgres 18 local (Docker)
docker start cv-pg18           # porta 5433, role de app cv_app

# 2) dev-server (simula API Gateway + authorizer + handlers Lambda) na porta 8000
cd ..\contrato_visto_backend-main
.\.venv\Scripts\python.exe tools\local_server.py
```

Saúde rápida (rota protegida responde 401 sem token = no ar):

```powershell
Invoke-WebRequest http://127.0.0.1:8000/api/v1/pricing -SkipHttpErrorCheck
```

## Comandos de validação

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## Autenticação (dev local, real por e-mail/senha)

O login é por **e-mail e senha** reais contra o backend local:

- **Cadastro** (`POST /api/v1/users`): cria uma nova organização e o primeiro usuário como
  `admin` (dono do tenant). Política de senha: mínimo 12 caracteres, com maiúscula,
  minúscula e caractere especial (alinhada ao backend).
- **Login** (`POST /api/v1/auth/login`): retorna um JWT (HS256, dev) guardado em
  `localStorage`; o `apiClient` envia `Authorization: Bearer <token>` automaticamente.
- **Sair**: limpa a sessão pelo Header.

Papéis reconhecidos pelo backend: `admin`, `analyst`, `viewer`. O `organization_id` vem
sempre do token/contexto autenticado — nunca de payloads enviados pela UI. Em produção o
fallback mock é desligado e a sessão não persiste PII (fail-closed).

## Rotas

```text
/                Visão operacional inicial
/login           Cadastro/login por e-mail e senha (dev local)
/dashboard       Painel operacional (métricas + áreas + atividade recente)
/cases           Casos (lista, busca, criar caso rápido)
/cases/new       Novo Pedido (wizard: partes, contrato, produto, módulos, revisão)
/cases/[id]      Detalhe do caso (partes, timeline, triagem, relatório)
/documents       Documentos (upload presign, lista, download-url, enfileirar processamento)
/clients         Clientes (CRUD; CPF/CNPJ/RG validados)
/reports         Relatórios/pareceres
/analyst         Triagem/revisão conceitual
/admin           Governança (atalhos + referência de papéis)
/admin/pricing   Configuração de pricing
/settings        Configurações locais (organização, segurança, tema)
/verify-email    Confirmação de e-mail (simulada localmente)
```

Rotas internas usam uma guarda local (`AuthGuard`): sem sessão salva, redireciona para `/login`.

## Estados de UX

Componentes compartilhados para feedback consistente: `LoadingState`, `ErrorState`,
`EmptyState`, `FormField`/`TextInput`/`TextArea`/`SelectInput`, `Notification`,
`ConfirmDialog`. A busca global (Header) consulta casos e clientes no backend; o sino de
notificações deriva de casos (triagem concluída, relatório gerado) e documentos processados.

## Estrutura

```text
components/            componentes de UI (AppLayout, Header, Card, Button, AuthGuard, ...)
  cases/wizard/        wizard do Novo Pedido (PartyForm, ContractStep, ModulesStep, ...)
src/app/               rotas (App Router): dashboard, cases, documents, clients, reports,
                       analyst, admin, settings, login, verify-email
src/services/          camada de API (apiClient, cases, clients, documents, reports, authApi, ...)
src/lib/               authStorage, useDevSession, validation, cpfCnpj, clientForm, runtimeEnv
types/                 contratos compartilhados (api.ts, domain.ts, index.ts)
```

## Integração com a API

`src/services/apiClient.ts` usa o rewrite `/api/v1/*` e injeta `Authorization: Bearer` da
sessão salva. Endpoints consumidos pelas telas (não exaustivo):

```text
POST /api/v1/users                         cadastro (cria org + admin)
POST /api/v1/auth/login                     login (JWT)
GET  /api/v1/me                             perfil da sessão
GET/POST /api/v1/clients                    clientes (+ ?q= busca)  ·  PATCH /clients/{id}
GET/POST /api/v1/cases                      casos (+ ?q= busca)     ·  PATCH/DELETE /cases/{id}
GET  /api/v1/cases/{id}/aggregate           detalhe agregado do caso
POST /api/v1/requests                       wizard Novo Pedido (cria caso + partes + doc + triagem)
GET/POST /api/v1/documents                  documentos (+ ?status=) · PATCH /documents/{id}
POST /api/v1/documents/{id}/enqueue-processing   enfileira ingestão (SP1)
GET  /api/v1/documents/{id}/download-url     URL pré-assinada
POST /api/v1/cases/{id}/triage/run          executa triagem
GET/POST /api/v1/cases/{id}/report[/generate|/review]   parecer + revisão humana
GET/POST/PUT /api/v1/pricing[...]           catálogo, estimativa, config
```

## Limites desta fase (MVP local)

- Sem Cognito/auth gerenciado, sem S3/SQS/OCR/IA/RAG/e-mail reais (adapters mock no backend).
- Upload local registra metadados + presign (sem envio real ao S3 nesta fase).
- Cross-browser/real device, HTTPS, CORS de produção, monitoramento e custos ficam para
  staging/deploy (Fase 7). Use apenas dados fictícios neste ambiente.

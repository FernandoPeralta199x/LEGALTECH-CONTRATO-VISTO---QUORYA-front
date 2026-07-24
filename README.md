# Contrato Visto — Frontend

Frontend em Next.js + TypeScript do **Contrato Visto** (LegalTech). Consome o backend
serverless por um BFF same-origin, mantendo o token de acesso fora do JavaScript do
navegador.

## Stack

- Next.js 16 (Turbopack) · React 19 · TypeScript
- Tailwind CSS · lucide-react (ícones)
- Testes: `node:test` via `tsx` (**108 testes**); `tsc --noEmit` + `eslint --max-warnings=0` no CI

## Configuração local

Crie o `.env.local` a partir do exemplo:

```powershell
Copy-Item .env.example .env.local
```

Configuração mínima local:

```env
NEXT_PUBLIC_APP_NAME=Contrato Visto
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_ENABLE_API_MOCK_FALLBACK=true
APP_ORIGIN=http://localhost:3000
API_BASE_URL=http://127.0.0.1:8000
AUTH_COOKIE_SECRET=gere-um-segredo-aleatorio-com-pelo-menos-32-caracteres
```

`API_BASE_URL`, `APP_ORIGIN` e `AUTH_COOKIE_SECRET` são variáveis exclusivas do servidor
Next.js e nunca devem usar o prefixo `NEXT_PUBLIC_`. Em produção, `API_BASE_URL` precisa
usar HTTPS e `APP_ORIGIN` deve ser a origem exata do deploy.
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

## Autenticação via BFF

O login é por **e-mail e senha** reais contra o backend local:

- **Cadastro** (`POST /api/v1/users`): cria uma nova organização e o primeiro usuário como
  `admin` (dono do tenant). Política de senha: mínimo 12 caracteres, com maiúscula,
  minúscula e caractere especial (alinhada ao backend).
- **Login** (`POST /api/auth/login`): o BFF autentica no backend, valida o perfil e
  cifra o JWT com AES-256-GCM em cookie `HttpOnly`, `Secure` e `SameSite=Lax`.
- **Sessão** (`GET /api/auth/session`): retorna somente perfil público; nunca retorna JWT.
- **API autenticada** (`/api/backend/api/v1/*`): o BFF abre o cookie no servidor e injeta
  `Authorization: Bearer` apenas na chamada interna ao backend.
- **CSRF**: toda mutação exige origem exata, cookie `SameSite=Strict` e
  `X-CSRF-Token` correspondente.
- **Sair** (`POST /api/auth/logout`): invalida os cookies e limpa dados locais legados.
- **Reset de senha revoga sessões anteriores** (backend, AUTH-02): um token emitido antes da
  troca passa a receber `403` nas ações de escrita/admin — refaça login.

Papéis e `organization_id` vêm sempre do token/contexto validado pelo backend, nunca de
payloads enviados pela UI. O frontend usa o papel apenas para UX; autorização real
continua obrigatória no backend.

## Rotas

```text
/                Visão operacional inicial
/login           Cadastro/login por e-mail e senha via BFF
/dashboard       Painel operacional (métricas + áreas + atividade recente)
/cases           Casos (lista, busca, criar caso rápido)
/cases/new       Novo Pedido (wizard: partes, contrato, produto, módulos, revisão)
/cases/[id]      Detalhe do caso (partes, timeline, triagem, relatório)
/cases/[id]/pagamento  Pagamento do caso (parcelas / cartão via token)
/documents       Documentos (upload presign, lista, download-url, enfileirar processamento)
/clients         Clientes (CRUD; CPF/CNPJ/RG validados)
/reports         Relatórios/pareceres
/financial       Módulo financeiro (visão geral, vendas, pagamentos, custos, tributos, notas, relatório, auditoria) — admin
/analyst         Triagem/revisão conceitual
/admin           Governança (atalhos + referência de papéis)
/admin/pricing   Configuração de pricing
/settings        Configurações locais (organização, segurança, tema)
```

Rotas internas usam `AuthGuard`: a sessão é revalidada no backend antes de liberar a UI.

## Estados de UX

Componentes compartilhados para feedback consistente: `LoadingState`, `ErrorState`,
`EmptyState`, `FormField`/`TextInput`/`TextArea`/`SelectInput`, `Notification`,
`ConfirmDialog`. A busca global (Header) consulta casos e clientes no backend (com navegação
por teclado e `role="listbox"`); o sino de notificações deriva de casos (triagem concluída,
relatório gerado) e documentos processados, com cache isolado por usuário.

**Acessibilidade & permissões:** skip-to-content, `aria-current` na navegação, foco/`inert` no
drawer mobile, `role="tablist"` no detalhe do caso; ações de escrita (upload, envio, exclusão)
ficam atrás de `canWrite` — `viewer` vê o conteúdo em modo somente-leitura.

## Estrutura

```text
components/            componentes de UI (AppLayout, Header, Card, Button, AuthGuard, ...)
  cases/wizard/        wizard do Novo Pedido (PartyForm, ContractStep, ModulesStep, ...)
src/app/               rotas (App Router): dashboard, cases, documents, clients, reports,
                       analyst, admin, settings, login
src/services/          camada de API (apiClient, cases, clients, documents, reports, authApi, ...)
src/lib/               sessionClient, useSession, validation, cpfCnpj, clientForm, runtimeEnv
src/server/            criptografia de sessão, CSRF, cliente do backend e limites do BFF
types/                 contratos compartilhados (api.ts, domain.ts, index.ts)
```

## Integração com a API

`src/services/apiClient.ts` chama apenas o BFF same-origin. O navegador nunca recebe nem
envia diretamente o JWT. Endpoints do backend consumidos pelo BFF (não exaustivo):

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

## Segurança de dependências (npm audit)

Estado (reverificado 2026-07-17, sem mudança): **2 vulnerabilidades moderadas**, ambas do
mesmo pacote transitivo. O CI (`.github/workflows/ci.yml`) roda `npm audit --audit-level=high`,
que **não** falha por estas (moderate).

- **Pacote:** `postcss <8.5.10` — XSS via `</style>` não escapado na saída do stringify de CSS
  ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)).
- **Como entra:** apenas de forma transitiva, por dentro do `next` (`node_modules/next/node_modules/postcss`).
  Não é dependência direta do projeto.
- **Exposição real:** baixa. O advisory afeta quem processa CSS não confiável com o PostCSS;
  aqui o PostCSS roda apenas no build do Tailwind sobre CSS próprio (sem input de terceiros).
- **Decisão:** **não corrigir agora.** O único remediador oferecido pelo npm é
  `npm audit fix --force`, que **rebaixa o `next` para 9.3.3** — uma mudança quebrada
  (incompatível com Next 16 / React 19 / App Router usados aqui). A correção correta é aguardar
  um release do Next que traga `postcss >= 8.5.10` e então subir o `next` normalmente.
- **Não rode `npm audit fix --force` neste repositório.**

## Limites desta fase (MVP local)

- Sem Cognito/auth gerenciado; a autenticação atual usa BFF e cookie HttpOnly cifrado.
  S3/SQS/OCR/IA/RAG/e-mail ainda dependem da configuração real dos adapters do backend.
- Upload local registra metadados + presign (sem envio real ao S3 nesta fase).
- Cross-browser/real device, HTTPS, CORS de produção, monitoramento e custos ficam para
  staging/deploy (Fase 7). Use apenas dados fictícios neste ambiente.

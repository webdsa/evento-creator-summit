# Análise de Segurança e Correções

## O que já estava correto

- **Autenticação admin**: Todas as rotas em `/api/admin/*` exigem `requireAdmin()`, que valida o token Firebase (Bearer) e verifica se o usuário está na coleção `admins`.
- **APIs públicas com rate limit**: Inscrição, consulta de status e validação de voucher usam `checkRateLimit()` por IP (evita abuso e força bruta).
- **Validação de enums**: Gênero, tamanho de camiseta e função na inscrição são validados contra listas fixas.
- **E-mail**: Formato validado por regex nas APIs públicas.
- **Respostas de erro**: APIs retornam `genericError` em falhas inesperadas, sem vazar stack trace ou detalhes internos ao cliente.
- **Firebase Admin**: Credenciais apenas no servidor (variáveis de ambiente); token JWT verificado com `verifyIdToken()`.

## Correções aplicadas

### 1. Security headers (next.config.js)

- **X-Content-Type-Options: nosniff** – Evita MIME sniffing.
- **X-Frame-Options: DENY** – Reduz risco de clickjacking.
- **X-XSS-Protection: 1; mode=block** – Camada extra contra XSS em navegadores antigos.
- **Referrer-Policy: strict-origin-when-cross-origin** – Limita vazamento de URL de origem.
- **Permissions-Policy** – Desabilita camera, microphone e geolocation.

### 2. Limite no identificador de rate limit (lib/rate-limit.ts)

- O valor usado como chave (ex.: `x-forwarded-for`) é truncado a 64 caracteres para evitar uso de headers enormes e abuso do mapa em memória.

### 3. Validação e limites nas APIs públicas

- **POST /api/public/registrations**
  - Trim e normalização de todos os campos de texto.
  - Limites máximos: voucher 64, nome 200, e-mail 254, telefone 50, função 100 caracteres.
  - Rejeição com 400 quando algum limite é ultrapassado.

- **GET /api/public/registration/status**
  - Código limitado a 32 caracteres e e-mail a 254 (trim e slice antes de usar).
  - E-mail validado por regex.

- **GET /api/public/voucher/validate**
  - Código do voucher limitado a 64 caracteres (trim e slice).

### 4. Validação nas APIs admin

- **Institutions (POST e PATCH)**  
  - Nome: obrigatório, trim, máximo 200 caracteres.  
  - `quota_total`: inteiro, entre 0 e 1.000.000.  
  - `status`: apenas `'active'` ou `'inactive'`.

- **Vouchers (POST e PATCH)**  
  - Código: trim, uppercase, 1–64 caracteres.  
  - `institution_id`: string não vazia, até 1500 caracteres (compatível com ID Firestore).  
  - `quota_total`: inteiro, 0–1.000.000.  
  - `status`: apenas `'active'` ou `'paused'`.  
  - `expires_at`: ISO válido ou null.

- **IDs em rotas dinâmicas**  
  - Em todas as rotas admin que recebem `[id]` (institutions, vouchers, registrations), o `id` é validado: string não vazia e até 1500 caracteres antes de chamar o banco.

## Recomendações adicionais

- Manter variáveis sensíveis (Firebase private key, SendGrid, Resend, etc.) apenas em `.env` e nunca em código ou repositório.
- Em produção, usar proxy (ex.: Vercel, nginx) que defina `x-forwarded-for` corretamente para o rate limit por IP.
- Rodar `npm audit` periodicamente e corrigir dependências vulneráveis.
- Considerar CSP (Content-Security-Policy) se houver risco de XSS por conteúdo dinâmico.

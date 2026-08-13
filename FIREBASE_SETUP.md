# Configuração do Firebase

Este projeto usa **Firebase** (Firestore + Authentication) como banco de dados e autenticação.

## 1. Criar projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **Adicionar projeto** e siga o assistente
3. (Opcional) Ative o Google Analytics

## 2. Ativar Firestore e Authentication

- **Firestore**: No menu lateral → **Build** → **Firestore Database** → **Criar banco** (modo produção; as regras podem ficar restritivas pois o app usa Admin SDK no servidor)
- **Authentication**: **Build** → **Authentication** → **Começar** → em **Sign-in method** habilite **E-mail/Senha**

## 3. Registrar o app (Web)

1. Na página inicial do projeto → ícone **Web** (`</>`)
2. Registre o app com um apelido (ex.: "Eventos Web")
3. Copie o objeto `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)

## 4. Variáveis de ambiente (cliente)

No `.env` (ou `.env.local`), defina as chaves públicas (podem ser expostas no cliente):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 5. Conta de serviço (servidor)

Para as APIs Next.js usarem o Firestore e verificarem tokens no servidor:

1. Firebase Console → **Configurações do projeto** (ícone de engrenagem) → **Contas de serviço**
2. Clique em **Gerar nova chave privada**
3. Um JSON será baixado. Use os campos:
   - `client_email` → variável `FIREBASE_CLIENT_EMAIL`
   - `private_key` → variável `FIREBASE_PRIVATE_KEY` (copie o valor inteiro, incluindo `\n`; no `.env` pode ser entre aspas)

Exemplo no `.env`:

```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**Importante**: Não faça commit do JSON ou do `.env`. O `.env` já deve estar no `.gitignore`.

### Deploy na Vercel: conta de serviço é obrigatória

Sim. Na Vercel as rotas de API (`/api/...`) rodam no **servidor** (Node.js). Quem acessa o Firestore e verifica o token de admin é o **Firebase Admin SDK**, que **só funciona com conta de serviço**. Não há como evitar isso em hospedagem serverless.

Configure na Vercel as **mesmas** variáveis:

1. **Vercel** → seu projeto → **Settings** → **Environment Variables**
2. Adicione todas (cliente + servidor):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` — cole a chave privada **inteira** (incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`). Na Vercel você pode colar com quebras de linha reais; o código já trata `\n` no valor. Se preferir, use `\n` no lugar de cada Enter.

Marque as variáveis para **Production**, **Preview** e **Development** conforme quiser e faça um novo deploy.

## 6. Criar as “tabelas” (estrutura) no Firestore

No Firestore não existem tabelas; as **coleções** aparecem quando o primeiro documento é criado. Para o app funcionar, é necessário **inicializar o contador de códigos de inscrição**.

### 6.1 Inicializar o contador (obrigatório)

No terminal, na raiz do projeto (com `.env` ou `.env.local` configurado):

```bash
npm run init-firestore
```

Isso cria:
- o documento **counters/registration_code** com campo `value: 0` (códigos MT-000001, MT-000002, etc.);
- a coleção **registrations** (inscritos) com um documento placeholder `_init`, para que ela apareça no Console do Firebase. O painel admin ignora esse documento ao listar inscrições.

### 6.2 Dados de exemplo (opcional)

Para criar uma instituição e um voucher de teste em um passo:

```bash
npm run init-firestore:seed
```

Serão criados:

- **institutions** – um documento “Instituição Exemplo” (quota 50)
- **vouchers** – um voucher com código `TESTE-01`
- **voucher_codes** – documento com ID `TESTE-01` apontando para esse voucher

Depois você pode acessar `/inscricao?code=TESTE-01` para testar a inscrição.

### 6.3 Estrutura das coleções (referência)

| Coleção          | Uso |
|------------------|-----|
| **institutions** | name, quota_total, used_count, status, created_at, updated_at |
| **vouchers**     | code, institution_id, quota_total, used_count, status, expires_at, created_at, updated_at |
| **voucher_codes**| ID do doc = código (maiúsculas); campo `voucherId` |
| **registrations**| registration_code, full_name, email, phone, institution_id, voucher_id, status, … |
| **email_index**  | ID = e-mail normalizado (minúsculas); campo `registrationId` |
| **admins**       | ID = UID do usuário (Firebase Auth); campo `enabled: true` |
| **counters**     | doc `registration_code` com campo `value` (número) |

As demais coleções (**registrations**, **email_index**, **admins**) são preenchidas pelo app (inscrições e script de admin). Não é preciso criá-las manualmente no Console.

## 7. Criar o primeiro admin

1. **Authentication** → **Users** → **Add user** (e-mail e senha)
2. Copie o **User UID**
3. **Firestore** → **Start collection** → collection id: `admins`
4. Document id: **cole o User UID**
5. Campos: `enabled` (boolean) = `true`, `created_at` (string) = data em ISO (opcional)

Depois faça login em `/admin/login` com esse e-mail e senha.

## 8. Regras do Firestore (opcional)

O app usa o **Admin SDK** nas APIs (servidor), então não precisa liberar leitura/escrita do cliente no Firestore. Se quiser travar qualquer acesso direto do cliente, use no Firebase Console → Firestore → Regras algo como:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

O arquivo `firestore.rules` na raiz do projeto pode ser usado com `firebase deploy --only firestore:rules` se você inicializar o Firebase CLI no projeto.

## 9. Deploy das regras (Firebase CLI)

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# escolha o projeto e use o arquivo firestore.rules existente
firebase deploy --only firestore:rules
```

Pronto. Com `.env` preenchido, rode `npm run dev` e acesse a aplicação.

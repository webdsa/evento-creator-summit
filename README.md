# Creators Summit 2026 - Sistema de Inscrições

Sistema completo de gestão de inscrições para o evento Creators Summit 2026, com controle de vagas por instituição, vouchers e multi-idioma (PT-BR/ES).

## ✨ Funcionalidades

### Público
- Inscrição via link com voucher (`/inscricao?code=VOUCHER`)
- Validação em tempo real de vagas disponíveis
- Multi-idioma (PT-BR/ES) com detecção automática
- Dedupe por e-mail (um e-mail = uma inscrição)
- E-mail de confirmação no idioma do inscrito

### Admin (`/admin`)
- Dashboard com estatísticas e alertas
- Gestão de instituições (quotas, status)
- Gestão de vouchers (criação, pausa, links)
- Listagem de inscrições com busca
- Cancelamento idempotente com devolução de vagas
- Reenvio de e-mails de confirmação
- Exportação CSV

## 🚀 Setup Rápido

### 1. Variáveis de Ambiente

O projeto usa **Firebase** (Firestore + Auth). Copie `.env.example` para `.env` e preencha:

- **NEXT_PUBLIC_FIREBASE_***: no Firebase Console → Configurações do projeto → Seus apps
- **FIREBASE_CLIENT_EMAIL** e **FIREBASE_PRIVATE_KEY**: criar uma conta de serviço em Firebase Console → Configurações do projeto → Contas de serviço → Gerar nova chave privada

Veja o passo a passo em `FIREBASE_SETUP.md`.

### 2. Criar Usuário Admin

1. No **Firebase Console** → Authentication → Sign-in method → habilite **E-mail/Senha**
2. Crie um usuário em Authentication → Users → Add user (ex.: `admin@midiatec.com` / senha forte)
3. Copie o **User UID** do usuário criado
4. No **Firestore** (Console), crie a coleção `admins` e um documento com ID = **User UID** e campo `enabled: true` (e opcionalmente `created_at` com timestamp)

Veja instruções completas em `ADMIN_SETUP.md` (seção Firebase).

### 3. Rodar Aplicação

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

## 📦 Vouchers de Teste

O sistema vem com dados seed pré-carregados:

- `MIDIATEC-DSA-10` - DSA (10 vagas)
- `MIDIATEC-DSA-10B` - DSA (10 vagas)
- `MIDIATEC-US-10` - União Sul (10 vagas)

Links de teste:
- http://localhost:3000/inscricao?code=MIDIATEC-DSA-10
- http://localhost:3000/inscricao?code=MIDIATEC-US-10

## 🔐 Acesso Admin

- URL: `/admin/login`
- Email: `admin@midiatec.com` (após criar)
- Senha: `admin123` (após criar)

## 🏗️ Stack Técnica

- **Framework**: Next.js 13.5.1 (App Router)
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **i18n**: React Context (PT-BR/ES)

## 📊 Arquitetura de Banco (Firestore)

### Coleções

- `institutions` - Instituições com quotas e status
- `vouchers` - Vouchers vinculados a instituições (code, quota, used_count, status, expires_at)
- `voucher_codes` - Documento por código (ID = código) → `voucherId` para lookup
- `registrations` - Inscrições com código sequencial (MT-XXXXXX), status, instituição
- `email_index` - Documento por e-mail normalizado (ID = email) → `registrationId` (dedupe)
- `admins` - Documento por User UID → `enabled: true`
- `counters` - Contador para `registration_code` (MT-000001, …)

### Lógica de Negócio

- **create_registration** (em `lib/db.ts`): transação Firestore valida voucher/instituição, quota, e-mail e cria inscrição + email_index e incrementa used_count
- **cancel_registration**: transação atualiza status da inscrição e decrementa used_count em voucher e instituição
- APIs admin exigem header `Authorization: Bearer <Firebase ID Token>` e checagem na coleção `admins`

## 📧 E-mails de Confirmação

O reenvio manual está disponível no admin. Para envio automático após inscrição:

- O projeto tinha uma Edge Function Supabase (`supabase/functions/send-confirmation-email`) que lia do PostgreSQL. Com a migração para Firebase, você pode:
  - Implementar uma **Cloud Function** (Firebase) que seja acionada por agendamento ou por escrita em `registrations`, leia registros com `confirmation_email_sent_at == null` no Firestore e envie o e-mail (SendGrid, Resend, etc.), atualizando o documento após envio.
- Templates HTML em PT-BR e ES estão na lógica da função antiga e podem ser reutilizados.
- Admin pode reenviar manualmente (zera `confirmation_email_sent_at` e sua função/cron pode reprocessar).

## 🔒 Segurança

- **Rate Limiting**: 10 requisições/minuto nos endpoints públicos
- **Transações Firestore**: create_registration e cancel_registration usam transações
- **Validação**: Dedupe de e-mail via coleção `email_index` (documento por e-mail)
- **Auth**: Firebase Auth; rotas admin verificam token e coleção `admins`

## 🌍 Multi-idioma

- Detecção automática do idioma do navegador
- Seletor manual PT|ES no header
- Idioma persistido em localStorage
- **Idioma salvo no registro** para e-mails
- Templates de e-mail em ambos idiomas

## 📝 Build e Deploy

### Build Local

```bash
npm run build
```

**Nota**: O build mostra avisos de export para páginas admin. Isso é esperado e não impacta o funcionamento - as páginas admin requerem renderização runtime por usarem autenticação.

### Deploy (Vercel)

1. Conecte o repositório no Vercel
2. Configure as variáveis de ambiente (copie do `.env`)
3. Deploy automático

## 🧪 Testes

### Testar Inscrição

1. Acesse `/inscricao?code=MIDIATEC-DSA-10`
2. Preencha o formulário
3. Verifique tela de sucesso com código de registro

### Testar Admin

1. Crie usuário admin (ver seção Setup)
2. Login em `/admin/login`
3. Explore dashboard, instituições, vouchers e inscrições

### Testar Controle de Vagas

1. Configure um voucher com 1 vaga
2. Faça inscrição para esgotá-lo
3. Tente nova inscrição - deve ser bloqueada
4. Cancele a primeira inscrição no admin
5. Tente nova inscrição - deve funcionar

## 📄 Arquivos Importantes

- `FIREBASE_SETUP.md` - Configuração do Firebase e variáveis de ambiente
- `ADMIN_SETUP.md` - Guia para criar usuário admin (Firebase)
- `/lib/db.ts` - Acesso Firestore (inscrições, vouchers, instituições, admins)
- `/lib/firebase.ts` e `/lib/firebase-admin.ts` - Cliente e Admin SDK
- `/lib/i18n/` - Sistema de internacionalização
- `/app/admin/` - Painel administrativo
- `/app/inscricao/` - Página pública de inscrição
- `/app/api/public/` - APIs públicas com rate limit
- `/app/api/admin/` - APIs admin (exigem token Firebase)

## 🐛 Troubleshooting

### "Email já inscrito"
O sistema impede inscrições duplicadas. Cada e-mail pode se inscrever apenas uma vez.

### "Vagas esgotadas"
Verifique no admin:
- Quotas da instituição e voucher
- Inscrições confirmadas vs canceladas

### "Erro ao fazer login no admin"
1. Verifique se o usuário foi criado no Firebase Authentication (E-mail/Senha)
2. Verifique se existe um documento em `admins/{userUid}` com `enabled: true`
3. Use “Esqueci a senha” no Firebase Console se necessário

### Build warnings sobre prerender
Normal! As páginas admin usam contexto client-side e não podem ser exportadas estaticamente. Funcionam perfeitamente em runtime.

## 📚 Documentação Adicional

- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com/)

## 🤝 Contribuindo

1. Crie branch: `git checkout -b feature/nova-funcionalidade`
2. Commit: `git commit -m 'Add nova funcionalidade'`
3. Push: `git push origin feature/nova-funcionalidade`
4. Abra Pull Request

## 📝 Licença

Projeto desenvolvido para a Igreja Adventista do Sétimo Dia.

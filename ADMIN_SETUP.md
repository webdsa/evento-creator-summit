# Como Criar Usuário Admin

**Este projeto usa Firebase.** Você pode criar o primeiro admin pelo script (recomendado) ou manualmente no Console.

## Opção 1: Script (recomendado)

Na raiz do projeto, com o `.env` configurado:

```bash
npm run create-admin
```

Isso cria um usuário **admin@exemplo.com** com senha **admin123** no Firebase Authentication e adiciona o documento na coleção **admins**. Depois acesse `/admin/login` e use essas credenciais.

Para usar outro e-mail/senha:

```bash
node scripts/create-admin.js seu@email.com SuaSenhaSegura
```

---

## Opção 2: Manual no Firebase Console

### 1. Criar o usuário no Authentication

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e selecione seu projeto.
2. Vá em **Build** → **Authentication** → **Users**.
3. Clique em **Add user**.
4. Defina **E-mail** e **Senha** (ex.: `admin@midiatec.com` e uma senha forte).
5. Clique em **Add user**.
6. **Copie o UID** do usuário (aparece na lista; algo como `a1b2c3d4e5f6...`).

### 2. Tornar o usuário admin no Firestore

1. No Firebase Console, vá em **Build** → **Firestore Database**.
2. Clique em **Start collection** (ou use a coleção existente).
3. **Collection ID**: `admins`.
4. **Document ID**: cole o **UID** que você copiou no passo anterior.
5. Adicione um campo:
   - **Campo**: `enabled`
   - **Tipo**: boolean
   - **Valor**: `true`
6. Clique em **Save**.

### 3. Fazer login no admin

1. Acesse **`/admin/login`** no seu site.
2. Use o **e-mail** e a **senha** que você definiu no passo 1.
3. Pronto.

**Resumo:** O usuário e a senha são os que você criou no Authentication. Não há credenciais padrão; quem faz o primeiro admin no Console escolhe o e-mail e a senha.

---

## Supabase (projeto antigo / referência)

### Passo 1: Criar usuário no Authentication

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Users**
4. Clique em **Add user** → **Create new user**
5. Preencha:
   - **Email**: admin@midiatec.com (ou o email que preferir)
   - **Password**: admin123 (ou a senha que preferir)
   - **Auto Confirm User**: ✅ Marque esta opção
6. Clique em **Create user**
7. **Copie o UUID do usuário criado** (aparece na lista de usuários)

### Passo 2: Adicionar usuário na tabela admins

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em **New query**
3. Cole o SQL abaixo, **SUBSTITUINDO** o UUID pelo que você copiou:

```sql
INSERT INTO admins (user_id, enabled)
VALUES ('COLE-O-UUID-AQUI', true);
```

Exemplo:
```sql
INSERT INTO admins (user_id, enabled)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', true);
```

4. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)

### Passo 3: Fazer Login

1. Acesse: `/admin/login`
2. Entre com o email e senha que você criou
3. Pronto! Você terá acesso ao painel administrativo

---

## Verificar Admin Criado

Para verificar se o admin foi criado corretamente, execute no SQL Editor:

```sql
SELECT
  u.id,
  u.email,
  u.created_at,
  a.enabled as is_admin
FROM auth.users u
LEFT JOIN admins a ON a.user_id = u.id
WHERE a.enabled = true;
```

Isso mostrará todos os usuários admin configurados.

---

## Solução de Problemas

### "Email já existe"
Se o email já existe, basta adicionar o UUID desse usuário na tabela admins usando o Passo 2.

### "Não consigo fazer login"
1. Verifique se o usuário foi marcado como "Auto Confirm" no dashboard
2. Verifique se existe um registro na tabela `admins` com `enabled = true`
3. Tente resetar a senha do usuário no dashboard

### "Acesso negado após login"
Execute este SQL para garantir que o usuário está na tabela admins:

```sql
-- Substitua o email pelo seu
UPDATE admins
SET enabled = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@midiatec.com'
);
```

---

## Credenciais (Firebase)

Não há usuário/senha padrão. Use o **e-mail e a senha** que você definiu ao criar o usuário em **Authentication** → **Add user**. A URL de login é **`/admin/login`**.

Se você criou o usuário com algo como `admin@midiatec.com` e `admin123`, use esses dados para entrar. **Recomendado:** altere a senha após o primeiro acesso (Firebase Console → Authentication → Users → ⋮ no usuário → Reset password).

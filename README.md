# Guia completo — App de Agendamento da Barbearia

Passo a passo do zero até o app instalado no celular. Siga na ordem:
**Firebase → GitHub → Vercel → Celular → Configurar a barbearia**.

---

## 1. Firebase (banco de dados gratuito)

É onde ficam salvos os barbeiros, serviços, horários e agendamentos — compartilhado entre o celular do cliente e o painel do barbeiro.

1. Acesse **console.firebase.google.com** e clique em **"Adicionar projeto"**.
2. Dê um nome (ex: `minha-barbearia`). Pode **desativar** o Google Analytics. Clique em **"Criar projeto"**.
3. No menu da esquerda, **Firestore Database** → **"Criar banco de dados"**.
   - Escolha **"Iniciar no modo de produção"**.
   - Região: `southamerica-east1 (São Paulo)`.
   - Clique em **Ativar**.
4. Ative o login anônimo: **Authentication** → **"Vamos começar"** → aba **"Sign-in method"** → **"Anônimo"** → ativar → **Salvar**.
5. Em **Firestore Database → Regras**, apague tudo e cole:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   Clique em **Publicar**.

   > 🔒 Só quem abre o app (e recebe uma sessão anônima automática) consegue ler ou
   > escrever no banco. Não é 100% à prova de tudo (alguém com conhecimento técnico
   > avançado poderia acessar pelas ferramentas de desenvolvedor do navegador), mas é
   > uma proteção sólida para o uso do dia a dia.

6. Tela inicial do projeto → ícone **`</>`** (Web) → nome qualquer (ex: `barbearia-web`) → **"Registrar app"** (não precisa marcar Hosting).
7. Copie o bloco `const firebaseConfig = { ... }` que aparece.
8. Abra `src/firebase.js` neste projeto e cole os valores reais no lugar dos valores de exemplo.
9. **Cole essa mesma configuração também** no arquivo `public/firebase-messaging-sw.js` (dentro do `firebase.initializeApp({...})`) — ele roda separado e precisa dos mesmos dados.

**Ver os dados depois:** Firestore Database → coleções `agendamentos`, `barbeiros`, `servicos`, `config`.

---

## 2. GitHub (guardar o código)

1. Crie uma conta grátis em **github.com**.
2. **"New repository"** → nome (ex: `barbearia-app`) → **Public** → **"Create repository"**.
3. Na página do repositório, clique em **"uploading an existing file"**.
4. Abra a pasta deste projeto no computador, selecione tudo (Ctrl+A) e arraste para o navegador.
5. Role até o fim e clique em **"Commit changes"**.

### Sempre que eu mandar um arquivo atualizado
1. No repositório, abra o arquivo que vai mudar → ícone de **lápis** (Edit).
2. Selecione tudo (Ctrl+A), apague, cole o conteúdo novo.
3. Role até o fim → **"Commit changes"**.
4. A Vercel publica a versão nova sozinha, em ~1 minuto.

---

## 3. Vercel (publicar o app com um link)

1. Crie uma conta grátis em **vercel.com**, com **"Continue with GitHub"**.
2. **"Add New… → Project"** → encontre o repositório (`barbearia-app`) → **"Import"**.
3. Confirme **Framework Preset = Vite**.
4. Antes de clicar em Deploy, abra **Environment Variables** e adicione (só são necessárias se você for usar os **lembretes automáticos** — passo 6; pode pular por agora e voltar depois):
   - `FIREBASE_SERVICE_ACCOUNT_KEY` → veja como gerar no passo 6.
   - `REMINDER_SECRET` → invente uma senha longa qualquer (ex: `barb3aria-lembrete-9x7z`).
5. Clique em **"Deploy"**. Em 1–2 minutos você recebe um link tipo `barbearia-app.vercel.app`.

### Se o build falhar
- **Erro de JSON no `package.json`**: algum arquivo foi upado errado — corrija pelo GitHub e a Vercel refaz o deploy sozinha.
- **"vite: command not found"**: Settings → General → Build & Development Settings → confirme Framework Preset = Vite, sem Override vazio em Build/Install Command. Depois Deployments → ⋯ → **Redeploy**.

---

## 4. Instalar no celular

**Android (Chrome):** abra o link → menu (⋮) → **"Adicionar à tela inicial"**.

**iPhone (precisa ser Safari):** abra o link → botão de compartilhar → **"Adicionar à Tela de Início"**.

---

## 5. Configurar a barbearia (primeiro uso)

1. No celular ou computador, acesse `SEU-LINK.vercel.app/admin`.
2. Na primeira vez, você vai criar o **nome da barbearia** e um **PIN** (para o painel do barbeiro ficar protegido). Guarde esse PIN.
3. Nas abas do painel:
   - **Horários**: marque os dias em que a barbearia funciona e o horário de início/fim de cada um.
   - **Barbeiros**: cadastre o nome de cada barbeiro.
   - **Serviços**: cadastre cada serviço (nome, duração em minutos, preço opcional).
4. Pronto — o app do cliente (`SEU-LINK.vercel.app`) já mostra os horários disponíveis de verdade.

O painel do barbeiro (**Agenda**) mostra os horários marcados dia a dia, com opção de marcar como **Concluído** ou **Cancelar**.

---

## 6. Notificações (opcional, um pouco mais técnico)

Duas coisas dependem da mesma configuração abaixo:
- O **cliente** pode ativar um lembrete ao confirmar o agendamento (avisa ~30 min antes).
- O **barbeiro** é avisado na hora, assim que um cliente marca um horário — basta clicar em **"Ativar notificações"** no canto superior do painel `/admin`, uma vez em cada aparelho que deve receber os avisos.

Para isso funcionar de verdade (mesmo com o app fechado), é preciso:

1. **Gerar a chave de notificação (VAPID):** no Firebase Console → ⚙️ Configurações do projeto → aba **Cloud Messaging** → em "Certificados push da Web", clique em **Gerar par de chaves**. Copie o valor e cole em `VAPID_KEY` no arquivo `src/firebase.js`.
2. **Gerar a chave do servidor:** Firebase Console → ⚙️ Configurações do projeto → aba **Contas de serviço** → **"Gerar nova chave privada"**. Baixa um arquivo `.json`.
3. Abra esse `.json`, copie **todo o conteúdo**, e cole como valor da variável `FIREBASE_SERVICE_ACCOUNT_KEY` nas Environment Variables do projeto na Vercel (Settings → Environment Variables). Cole o JSON inteiro, sem editar.
4. Defina também `REMINDER_SECRET` (uma senha qualquer, só você vai usar).
5. Depois de salvar as variáveis, vá em **Deployments** → ⋯ do último deploy → **Redeploy**.
6. Crie uma conta grátis em **cron-job.org**, e configure um "cronjob" novo:
   - URL: `https://SEU-LINK.vercel.app/api/send-reminders?secret=SEU_REMINDER_SECRET`
   - Intervalo: a cada 10 minutos (pra pegar o aviso perto dos 30 min antes, sem atraso grande).
   - Salvar e ativar.

O aviso ao barbeiro (passo 4 do fluxo) já funciona assim que os passos 1-5 acima estiverem prontos — não depende do cron-job.org, só o lembrete do cliente (~30 min antes) depende dele.

> Sem esse passo, o app funciona normalmente — só as notificações ficam desativadas.

---

## Resumo do fluxo para qualquer mudança futura

1. Eu mando o(s) arquivo(s) atualizado(s) aqui no chat.
2. Você substitui no GitHub (editar arquivo → colar → Commit changes).
3. A Vercel publica sozinha.
4. Reabre o app no celular com internet — ele sempre busca a versão mais nova primeiro.

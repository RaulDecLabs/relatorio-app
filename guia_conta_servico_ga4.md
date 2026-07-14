# Passo a Passo: Conta de Serviço do Google Analytics 4 (GA4)

Este guia explica como criar e configurar a Conta de Serviço do Google Cloud para que o script local do seu projeto consiga puxar os dados do Google Analytics 4 de forma direta e automática.

---

## 1. Criar a Conta de Serviço no Google Cloud Console

1. **Acesse o Console:**
   Entre no [Google Cloud Console](https://console.cloud.google.com/).

2. **Selecione o Projeto:**
   No menu superior esquerdo, clique no seletor de projetos e escolha o projeto associado à sua agência/site (ou crie um novo projeto, se preferir).

3. **Ative a API do Analytics:**
   * Na barra de pesquisa superior, digite **"Google Analytics Data API"** e clique no resultado correspondente.
   * Clique no botão azul **Ativar** (Enable). Isso permite que o script consulte os dados do GA4.

4. **Ir para Contas de Serviço:**
   * No menu de hambúrguer lateral esquerdo, vá em **IAM e Administrador** (IAM & Admin) ➔ **Contas de serviço** (Service Accounts).

5. **Criar a Conta:**
   * Clique em **"+ Criar conta de serviço"** (+ Create Service Account) no menu superior.
   * **Nome da conta de serviço:** Digite um nome fácil (ex: `insightos-ga4-import`).
   * **ID da conta de serviço:** O sistema gerará o ID automaticamente com base no nome.
   * Clique em **Criar e Continuar**.
   * Nos passos de "Papéis" (Roles), não é necessário selecionar nada. Apenas clique em **Concluir** (Done).

---

## 2. Gerar e Baixar a Chave JSON

1. **Acessar a Conta de Serviço:**
   Na lista de contas de serviço, clique em cima do endereço de e-mail da conta que você acabou de criar.

2. **Ir para a aba Chaves:**
   No menu superior da tela da conta de serviço, clique na aba **Chaves** (Keys).

3. **Criar Nova Chave:**
   * Clique no botão **Adicionar chave** (Add Key) ➔ **Criar nova chave** (Create new key).
   * Escolha o tipo **JSON** (já vem selecionado por padrão).
   * Clique em **Criar** (Create).

4. **Salvar no Projeto:**
   * O download do arquivo JSON começará automaticamente no seu computador.
   * Copie este arquivo baixado e cole-o na pasta raiz do seu projeto (onde fica o `package.json`).
   * Renomeie o arquivo exatamente para: `google-credentials.json`.

---

## 3. Dar Permissão no Painel do Google Analytics 4 (GA4)

Para o Google permitir que o seu script acesse os dados de um site, você precisa adicionar o e-mail da conta de serviço como usuário com acesso de leitura no Analytics:

1. **Copiar o E-mail da Conta de Serviço:**
   * Abra o arquivo JSON que você acabou de baixar e copie o endereço contido na linha `"client_email"` (ex: `insightos-ga4-import@seu-projeto-12345.iam.gserviceaccount.com`).
   * *Alternativamente, você pode copiar esse e-mail diretamente da lista no Google Cloud Console.*

2. **Acessar o Analytics:**
   * Entre no painel do [Google Analytics](https://analytics.google.com/).

3. **Ir em Administrador:**
   * No canto inferior esquerdo, clique no ícone de engrenagem (**Administrador**).

4. **Gerenciamento de Acesso:**
   * Na coluna da propriedade, clique em **Gerenciamento de acesso à propriedade** (Property Access Management).

5. **Adicionar Usuário:**
   * Clique no botão azul de **"+"** no canto superior direito e selecione **Adicionar usuários** (Add users).
   * No campo de e-mail, cole o e-mail da conta de serviço que você copiou no Passo 1.
   * Em funções, marque a opção **Leitor** (Viewer).
   * Desmarque a opção "Notificar novos usuários por e-mail" (já que é um e-mail de robô).
   * Clique em **Adicionar** no canto superior direito.

---

## 4. Configurar as Chaves no Arquivo `.env` do Projeto

Abra o arquivo `.env` da raiz do seu projeto e configure as seguintes linhas:

```env
# Insira a chave secreta de admin do seu projeto Supabase
SUPABASE_SERVICE_ROLE_KEY="sua_chave_service_role_secreta"

# Insira o ID numérico da sua propriedade do GA4
GA_PROPERTY_ID="seu_property_id_aqui"
```

*Nota: Você também pode gerenciar o ID do Analytics direto pelo painel de Relatórios clicando no botão **Configurar**!*

---

## 5. Rodar a Sincronização

Abra o terminal da sua máquina na pasta do seu projeto e execute o comando:

```bash
node scripts/import-ga4.js
```
Para trazer um histórico completo de 30 dias na primeira vez:
```bash
node scripts/import-ga4.js --days=30
```

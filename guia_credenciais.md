# Guia de Credenciais: Google Ads, Meta Ads e Google Analytics 4

Este guia explica detalhadamente como obter as credenciais necessárias para conectar as APIs de anúncios e analytics ao seu workflow do n8n.

---

## 1. Credenciais do Google Ads & Google Analytics 4 (GA4)

Como ambos são do ecossistema Google, você usará o **Google Cloud Console** para gerar um único par de **Client ID** e **Client Secret** para ambos.

### Passo 1: Criar um Projeto no Google Cloud Console
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. No menu superior esquerdo, clique em **Selecionar um projeto** > **Novo Projeto**.
3. Dê um nome (ex: `Agencia-InsightOS`) e clique em **Criar**.

### Passo 2: Ativar as APIs Necessárias
1. No painel do seu projeto, use a barra de busca e procure por:
   * **Google Ads API**: Clique em **Ativar**.
   * **Google Analytics Data API**: Clique em **Ativar**.

### Passo 3: Configurar a Tela de Consentimento OAuth (OAuth Consent Screen)
1. No menu lateral esquerdo, vá em **APIs e Serviços** > **Tela de consentimento OAuth**.
2. Escolha o tipo de usuário como **Externo** (External) e clique em **Criar**.
3. Preencha as informações básicas (Nome do app, email de suporte e email do desenvolvedor) e clique em **Salvar e Continuar**.
4. Na aba **Escopos** (Scopes), clique em **Adicionar ou remover escopos** e adicione o escopo do Google Analytics: `.../auth/analytics.readonly`. Clique em **Salvar e Continuar**.
5. Na aba **Usuários de teste** (Test Users), clique em **Adicionar Usuários** e coloque os seus emails do Google que você usará para fazer login nas contas de anúncios e analytics dos clientes. Clique em **Salvar e Continuar**.

### Passo 4: Criar o Client ID e Client Secret (OAuth 2.0 Credentials)
1. No menu lateral, acesse **APIs e Serviços** > **Credenciais**.
2. Clique em **Criar Credenciais** > **ID do cliente OAuth** (OAuth Client ID).
3. Em **Tipo de aplicativo**, escolha **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, insira a URL do seu n8n (ex: `https://n8n.declabsai.com.br`).
5. Em **URIs de redirecionamento autorizados**, insira a URL de redirecionamento que o n8n te fornece quando você cria uma credencial do Google. Geralmente é:
   `https://<sua-url-do-n8n>/rest/oauth2-credential/callback`
6. Clique em **Criar**. Copie o **ID do cliente** (Client ID) e a **Chave secreta do cliente** (Client Secret).

### Passo 5: Obter o Developer Token do Google Ads
1. Faça login na sua **Conta de Administrador do Google Ads (MCC)**. *(Se você não tiver, precisa criar uma conta tipo "Gerente" no Google Ads).*
2. Vá em **Ferramentas e Configurações** > **Configurações da Conta de Administrador** > **Central de APIs**.
3. Preencha o formulário para solicitar acesso à API. O Google gerará um **Developer Token** imediatamente em nível de "Acesso de teste" (que é suficiente para desenvolvimento e contas vinculadas à sua MCC).

---

## 2. Credenciais do Meta Ads (Facebook Ads)

Para o Facebook Ads, você precisará de uma conta no portal **Facebook Developers** e de um aplicativo configurado.

### Passo 1: Criar um Aplicativo no Meta para Desenvolvedores
1. Acesse o [Meta for Developers](https://developers.facebook.com/).
2. Clique em **Meus Aplicativos** > **Criar aplicativo**.
3. Escolha o caso de uso **Outro** > **Empresa** (Business) e clique em **Avançar**.
4. Dê um nome ao aplicativo (ex: `InsightOS-Integrador`), selecione a sua conta do Gerenciador de Negócios (Business Manager) vinculada e clique em **Criar aplicativo**.

### Passo 2: Adicionar o produto "Marketing API"
1. No painel do seu aplicativo, role até encontrar **Marketing API** e clique em **Configurar**.
2. No menu lateral esquerdo, sob "Marketing API", clique em **Configurações**.
3. Em **URIs de redirecionamento do OAuth autorizados**, insira a URL de redirecionamento fornecida pela credencial do Facebook no n8n. Geralmente é:
   `https://<sua-url-do-n8n>/rest/oauth2-credential/callback`

### Passo 3: Gerar um Token de Acesso de Longa Duração (System User Token)
Para que a integração não perca a conexão a cada poucas horas, é necessário gerar um token de Usuário do Sistema no seu Gerenciador de Negócios:
1. Acesse as **Configurações do Negócio** no [Meta Business Suite](https://business.facebook.com/settings).
2. No menu lateral, sob **Usuários**, clique em **Usuários do Sistema**.
3. Adicione um novo Usuário do Sistema com papel de **Administrador**.
4. Selecione o usuário criado e clique em **Gerar Novo Token**.
5. Selecione o aplicativo que você criou no Passo 1.
6. Selecione os seguintes escopos (permissões):
   * `ads_read` (Leitura de anúncios)
   * `ads_management` (Gerenciamento de anúncios, caso queira pausar/criar campanhas futuramente)
   * `read_insights` (Acesso às métricas de performance/visualização)
7. Clique em **Gerar Token**. Copie este token e guarde em local seguro (ele não expira e serve como senha de acesso).

---

## 3. ID das Contas Individuais de Cada Cliente

Além das credenciais de desenvolvedor (Client ID, Secret, App ID), você precisará do ID da conta específica de cada cliente para fazer a consulta no n8n:

1. **Google Ads Customer ID:** É o número de 10 dígitos (formato `XXX-XXX-XXXX`) localizado no canto superior direito de cada conta do Google Ads do cliente.
2. **Facebook Ad Account ID:** É o ID numérico da conta de anúncios do cliente. Você o encontra no Gerenciador de Anúncios (formato `act_XXXXXXXXXXXX` ou apenas os números).
3. **GA4 Property ID:** No painel do GA4 do cliente, vá em **Administrador** > **Configurações da propriedade**. O ID da propriedade é um número de 9 dígitos exibido no canto superior direito.

---

## 4. Facilitando Tudo com o n8n (Fluxo Prático de Login)

O n8n simplifica 90% do processo de OAuth 2.0. Em vez de você criar códigos complexos para gerenciar a renovação dos tokens, o n8n faz isso por você:

1. No n8n, clique em **Credentials** > **Add Credential**.
2. Digite **Google Ads OAuth2** ou **Facebook Ads OAuth2**.
3. Selecione **OAuth2** como tipo de autenticação.
4. Cole o **Client ID** e o **Client Secret** nos campos apropriados.
5. Clique em **Sign in with Google** (ou Facebook) e faça o login com a conta de administrador da agência.
6. Conceda as permissões de leitura e clique em **Save**.
7. Pronto! A partir de agora, o n8n se encarregará de renovar as chaves de acesso em segundo plano automaticamente de forma vitalícia.

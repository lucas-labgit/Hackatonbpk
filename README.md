# Hackatonbpk

# Base de Protocolos Públicos

Sistema web desenvolvido para cadastro, consulta e acompanhamento de protocolos em órgãos públicos, com filtros por empresa/órgão, painel de indicadores e integração opcional com backend FastAPI/Supabase.

O projeto foi criado para centralizar protocolos de diferentes órgãos em uma única interface, facilitando o acompanhamento de status, histórico de consultas, mudanças recentes e possíveis falhas de atualização.

## Funcionalidades

- Login de acesso ao sistema.
- Cadastro, edição, visualização e inativação de protocolos.
- Filtro por empresa/órgão público.
- Busca por número de protocolo, interessado ou órgão.
- Painel com indicadores gerais dos protocolos.
- Dashboard interno com filtros por projeto, órgão, status, situação e período.
- Importação de planilha CSV/TSV/TXT.
- Exportação de dados para Excel.
- Geração de PDF do dashboard.
- Histórico de consultas por protocolo.
- Integração com API FastAPI.
- Integração com banco Supabase.
- Scraping automatizado para consulta de protocolos da Prefeitura de Toledo.

## Empresas/órgãos disponíveis

O sistema possui empresas/órgãos configurados no arquivo `app.js`:

- Prefeitura de Toledo
- Cartório de Registro de Imóveis
- IAT
- ANAC
- Sanepar
- Copel
- SAIP
- Corpo de Bombeiros
- Prefeitura de Cascavel

## Tecnologias utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript puro
- LocalStorage
- Dialog API
- Fetch API

### Backend/API

- Python
- FastAPI
- Uvicorn
- Selenium
- WebDriver Manager
- Supabase/PostgreSQL

## Estrutura do projeto

```text
.
├── index.html                         # Tela principal do sistema
├── login.html                         # Tela de login
├── styles.css                         # Estilos gerais
├── app.js                             # Regras da interface, filtros, dashboard e protocolos
├── api.js                             # Comunicação com a API
├── config.js                          # Configuração das URLs e endpoints
├── login.js                           # Fluxo de autenticação local/API
├── assets/                            # Ícones usados na interface
├── imagens/                           # Logos e imagens dos órgãos/empresas
├── scraping_prefeitura_toledo/         # API e robô de consulta da Prefeitura de Toledo
├── BACKEND_E_BANCO.md                 # Guia técnico do backend e banco
└── CREDENCIAIS_LOGIN.md               # Observações sobre acesso/filtro por empresa
```

## Como rodar o frontend localmente

Este projeto não precisa de instalação com `npm`, porque o frontend usa HTML, CSS e JavaScript puro.

1. Clone o repositório:

```bash
git clone <url-do-repositorio>
```

2. Entre na pasta do projeto:

```bash
cd Hackatonbpk-main
```

3. Rode um servidor local na raiz do projeto:

```bash
python -m http.server 5500
```

4. Acesse no navegador:

```text
http://127.0.0.1:5500/login.html
```

## Configuração da API

As URLs da API ficam no arquivo `config.js`.

Exemplo:

```js
window.BPK_CONFIG = {
  API_BASE_URL: "https://sua-api.onrender.com",
  SCRAPING_API_BASE_URL: "http://127.0.0.1:8000",
  AUTH_ENABLED: false,
  READ_ONLY_API: false,
};
```

### Principais endpoints esperados

```text
GET    /api/protocolos
POST   /api/protocolos
PATCH  /api/protocolos/{protocol_id}
DELETE /api/protocolos/{protocol_id}
GET    /api/projetos
GET    /api/empresas
GET    /api/historico
POST   /api/consultas/executar
GET    /api/consultas/status
```

Se a API não estiver configurada ou estiver indisponível, parte do sistema pode continuar funcionando localmente com `localStorage`, mas a sincronização com o banco e o scraping não irão funcionar corretamente.

## Como rodar a API local de scraping

1. Entre na pasta da API:

```bash
cd scraping_prefeitura_toledo
```

2. Instale as dependências:

```bash
pip install -r scraping_prefeitura_toledo/requirements.txt
```

3. Rode a API local:

```bash
python -m uvicorn scraping_prefeitura_toledo.api_app:app --reload --port 8000
```

4. Teste no navegador ou via terminal:

```bash
http://127.0.0.1:8000/api/consultas/status
```

Ou:

```bash
curl http://127.0.0.1:8000/api/consultas/status
```

## Variáveis de ambiente

Crie um arquivo `.env` com base no arquivo `.env.example` dentro da pasta `scraping_prefeitura_toledo`.

Exemplo de variáveis necessárias:

```env
SUPABASE_URL=
SUPABASE_KEY=
PREFEITURA_TOLEDO_CPF_CNPJ=
SELENIUM_BROWSER=chrome
```

No Render/Linux, pode ser necessário configurar também:

```env
CHROME_BIN=/usr/bin/google-chrome
```

## Banco de dados

O backend espera uma tabela de protocolos no Supabase/PostgreSQL com campos relacionados a:

- empresa
- projeto
- número do protocolo
- órgão
- responsável
- atividade
- status atual
- situação
- data de abertura
- tipo de consulta
- link de consulta
- documento de consulta
- histórico de consultas

As instruções SQL completas estão documentadas no arquivo:

```text
BACKEND_E_BANCO.md
```

## Observações importantes

- O login atual não deve ser tratado como segurança definitiva de produção se estiver baseado apenas no frontend.
- Dados salvos em `localStorage` ficam apenas no navegador do usuário.
- Para uso real, o controle de acesso, permissões e persistência precisam ser garantidos pelo backend.
- O scraping depende do site consultado, do navegador instalado no ambiente e das variáveis de ambiente configuradas.
- Em deploy, é necessário liberar CORS no backend para o domínio onde o frontend estiver hospedado.

## Próximas melhorias sugeridas

- Implementar autenticação real com backend e tokens.
- Criar controle de permissões por empresa/usuário.
- Melhorar tratamento de erros da API na interface.
- Adicionar testes automatizados para cadastro, edição e filtros.
- Criar tela administrativa para gerenciar empresas e usuários.
- Padronizar status dos protocolos vindos de diferentes órgãos.
- Hospedar o scraping em ambiente com navegador configurado via Docker.

## Objetivo do projeto

O objetivo do sistema é tornar o acompanhamento de protocolos públicos mais organizado, visual e centralizado, reduzindo a necessidade de consultar manualmente diferentes sites e facilitando a identificação de pendências, mudanças de status e falhas de atualização.

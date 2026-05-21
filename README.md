# Hackatonbpk

Aplicacao web para cadastro e acompanhamento de protocolos com segregacao por empresa.

## Como rodar

1. Abra a pasta no VS Code.
2. Rode um servidor estatico na raiz do projeto.

```bash
python -m http.server 5500
```

3. Acesse:

```text
http://127.0.0.1:5500
```

## Integracao com backend no Render

1. Abra `config.js`.
2. Preencha `API_BASE_URL` com a URL publica do Render:

```js
API_BASE_URL: "https://seu-backend.onrender.com"
```

3. Se o seu backend usa rotas diferentes, ajuste apenas o bloco `ENDPOINTS` no mesmo arquivo.

Para o backend atual do Render, o frontend esta configurado para ler:

```text
GET /protocolos
GET /api/protocolos
GET /api/projetos
GET /api/empresas
GET /api/historico
```

Como o backend publicado ainda nao expoe rotas de login, cadastro, edicao ou remocao no OpenAPI, `config.js` esta com `AUTH_ENABLED: false` e `READ_ONLY_API: true`. Assim, a tela le os protocolos do Render, mas novas alteracoes feitas no frontend continuam locais ate o backend ter rotas `POST`, `PUT` e `DELETE`.

Quando `API_BASE_URL` fica vazio, o projeto continua funcionando localmente com `localStorage`.

No backend do Render, habilite CORS para o dominio onde este frontend estiver hospedado. Em desenvolvimento, libere tambem `http://127.0.0.1:5500`.

Exemplo em FastAPI:

```py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Para teste rapido durante o hackathon, tambem funciona usar `allow_origins=["*"]` se a API nao estiver usando cookies.

## Filtro por empresa (9 empresas)

Na pagina inicial, escolha uma empresa para filtrar os protocolos cadastrados.

- `CREDENCIAIS_LOGIN.md`

## Isolamento dos dados

Os protocolos sao salvos por empresa no `localStorage` com chaves separadas por `empresa_id`.

Observacao importante: isso organiza os dados por empresa no frontend, mas nao substitui seguranca real de backend.

## Power BI

O botao `Abrir dashboard no Power BI` abre o dashboard dentro do proprio sistema (iframe/modal), sem redirecionar para outro site.

Para ajustar os links, edite o bloco `COMPANY_LIST` no arquivo `app.js`:

```js
{ id: "emp01", name: "Empresa 01", powerBiUrl: "https://app.powerbi.com/..." }
```

Se quiser, troque as 9 URLs para dashboards diferentes (um por empresa).

### Observacao sobre login no Power BI

- Se o link for privado (`reportEmbed`), o Power BI pode pedir autenticacao Microsoft.
- Se quiser visualizacao sem login recorrente:
  1. usar `Publish to web` (publico, sem seguranca de dados), ou
  2. usar Power BI Embedded com token no backend (seguro, recomendado para dados privados).

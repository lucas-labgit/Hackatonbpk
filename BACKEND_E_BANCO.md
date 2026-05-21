# Backend e banco para o scraping

Este front agora envia os campos que o scraper usa:

- `tipo_consulta`
- `link_consulta`
- `documento_consulta`

## Banco Supabase

Confira se a tabela `protocolos` tem estas colunas:

```sql
alter table public.protocolos
  add column if not exists tipo_consulta text,
  add column if not exists link_consulta text,
  add column if not exists documento_consulta text,
  add column if not exists ultima_consulta timestamptz,
  add column if not exists observacao_consulta text;
```

Confira se a tabela de historico existe:

```sql
create extension if not exists pgcrypto;

create table if not exists public.historico_consultas (
  id uuid primary key default gen_random_uuid(),
  protocolo_id uuid not null references public.protocolos(id) on delete cascade,
  status text,
  status_anterior text,
  observacao text,
  texto_bruto text,
  data_movimentacao date,
  data_consulta timestamptz not null default now(),
  mudou_status boolean not null default false,
  erro text,
  fonte text
);

create index if not exists historico_consultas_protocolo_id_data_consulta_idx
  on public.historico_consultas (protocolo_id, data_consulta desc);
```

Para protocolos da Prefeitura de Toledo que ja existem, preencha o tipo e o link real da tela de consulta:

```sql
update public.protocolos
set
  tipo_consulta = 'prefeitura_toledo',
  link_consulta = 'COLE_A_URL_REAL_DA_CONSULTA_AQUI'
where orgao ilike '%Prefeitura%Toledo%';
```

Nao deixe a URL como placeholder. O scraper abre `link_consulta` diretamente.

## Backend FastAPI

Copie a pasta `scraping_prefeitura_toledo/scraping_prefeitura_toledo` para dentro do projeto do backend publicado no Render.

No arquivo principal do backend FastAPI, importe e inclua o router:

```py
from scraping_prefeitura_toledo.scraping_prefeitura_toledo.api_router import (
    router as consultas_router,
)

app.include_router(consultas_router)
```

Se quiser subir somente uma API local de teste a partir desta pasta, rode:

```bash
cd scraping_prefeitura_toledo
python -m uvicorn scraping_prefeitura_toledo.api_app:app --reload --port 8000
```

Teste local:

```bash
curl http://127.0.0.1:8000/api/consultas/status
curl -X POST http://127.0.0.1:8000/api/consultas/executar \
  -H "Content-Type: application/json" \
  -d '{"limit": 1, "headless": true}'
```

Para o front continuar usando o Render para protocolos, mas chamar essa API local apenas para o scraping, edite `config.js`:

```js
API_BASE_URL: "https://hackatonbpk-1.onrender.com",
SCRAPING_API_BASE_URL: "http://127.0.0.1:8000",
```

Depois do deploy, esta rota precisa aparecer no OpenAPI:

```txt
POST /api/consultas/executar
```

Teste:

```bash
curl -X POST https://hackatonbpk-1.onrender.com/api/consultas/executar \
  -H "Content-Type: application/json" \
  -d '{"limit": 1, "headless": true}'
```

## Variaveis de ambiente no Render

Cadastre no servico do backend:

```txt
SUPABASE_URL=...
SUPABASE_KEY=...
PREFEITURA_TOLEDO_CPF_CNPJ=...
SELENIUM_BROWSER=edge
```

Para Render/Linux, provavelmente use:

```txt
SELENIUM_BROWSER=chrome
CHROME_BIN=/usr/bin/google-chrome
```

## Observacao sobre Selenium no Render

O scraper usa Edge por padrao no Windows local, mas agora aceita `SELENIUM_BROWSER=chrome`. Se o Render nao tiver navegador instalado, a rota vai existir, mas a execucao vai falhar ao criar o navegador. Nesse caso, rode o backend em Docker com Chrome/Chromium instalado.

## Diagnostico rapido

Na pasta do projeto:

```bash
python scraping_prefeitura_toledo/scraping_prefeitura_toledo/diagnostico.py
```

Esse comando mostra se a API publicada tem a rota de scraping e se o `.env` local esta configurado para buscar protocolos no Supabase.

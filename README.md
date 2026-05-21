# Hackatonbpk Backend

Este repositorio pode ser publicado no Render como API. O site/front pode ficar em outro repositorio ou no GitHub Pages.

## Rotas

```text
GET    /api/health
POST   /api/login
POST   /api/logout
GET    /api/protocolos
POST   /api/protocolos
PUT    /api/protocolos/:id
DELETE /api/protocolos/:id
GET    /api/historico
POST   /api/consultar
```

`/api/consultar` esta reservado para ligar o Scrapy depois.

## Render

No Render, use:

```text
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Configure as variaveis de ambiente:

```text
SUPABASE_URL=https://kruiufvryjecaaczigav.supabase.co
SUPABASE_KEY=cole_a_chave_no_painel_do_render
BPK_EMAIL=admin@biopark.com
BPK_SENHA=admin123
BPK_SESSION_SECRET=troque-este-segredo
BPK_CORS_ORIGINS=https://lucas-labgit.github.io
```

## Arquivos que precisam subir para o backend

```text
server.py
app/
requirements.txt
supabase_schema.sql
README.md
.env.example
.gitignore
```

Os arquivos `index.html`, `app.js`, `styles.css` e `assets/` sao do front. Se o site ja existe em outro lugar, eles nao precisam ir para o deploy do backend no Render.

## Supabase

Se o banco ainda nao tiver tabelas, execute o arquivo `supabase_schema.sql` no SQL Editor do Supabase.

# Filtro de Empresas

O login por senha foi removido. A pagina inicial (`index.html`) agora mostra um filtro por empresa com botoes contendo imagem e nome.

## Como funciona

- O usuario escolhe uma empresa no painel inicial.
- O sistema carrega somente os protocolos vinculados a empresa selecionada.
- A empresa ativa fica salva no `localStorage` para manter a ultima selecao no navegador.

## Empresas atuais

| ID | Empresa | Imagem |
|---|---|---|
| `emp01` | Prefeitura Toledo | `imagens/PREFEITURA_TOLEDO.png` |
| `emp02` | Cartorio Reg. Imoveis | `imagens/IMOVEIS.png` |
| `emp03` | IAT | `imagens/IAC.png` |
| `emp04` | ANAC | `imagens/ANAC.png` |
| `emp05` | Sanepar | `imagens/SANEPAR.png` |
| `emp06` | Copel | `imagens/COPEL.png` |
| `emp07` | SAIP | `imagens/SAIP.png` |
| `emp08` | Corpo de Bombeiros | `imagens/BOMBEIROS.png` |
| `emp09` | Prefeitura de Cascavel | `imagens/CASCAVEL.png` |

## Onde alterar

As empresas ficam no array `COMPANY_LIST` em:

- `app.js`

Exemplo:

```js
{ id: "emp01", name: "Prefeitura Toledo", image: "imagens/PREFEITURA_TOLEDO.png" }
```

## Observacao importante

Esse filtro organiza os protocolos por empresa no frontend. Ele nao substitui controle de acesso real com backend.

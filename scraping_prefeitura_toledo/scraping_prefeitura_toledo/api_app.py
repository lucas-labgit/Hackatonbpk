from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from .api_router import router as consultas_router
    from .database import agora_iso, supabase_insert, supabase_select, supabase_update
except ImportError:
    from api_router import router as consultas_router
    from database import agora_iso, supabase_insert, supabase_select, supabase_update


app = FastAPI(title="BPK Scraping API")

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

app.include_router(consultas_router)


WRITABLE_PROTOCOL_FIELDS = {
    "empresa_id",
    "projeto_id",
    "numero_protocolo",
    "orgao",
    "responsavel",
    "atividade",
    "link_consulta",
    "tipo_consulta",
    "status_atual",
    "situacao",
    "anotacoes",
    "data_abertura",
    "data_finalizacao",
    "ativo",
    "estimado_inicio",
    "estimado_termino",
    "status_planilha",
    "observacao_consulta",
    "documento_consulta",
}

OPTIONAL_PROTOCOL_FIELDS = {"documento_consulta"}


def _clean_protocol_payload(payload):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload invalido.")

    cleaned = {
        key: value
        for key, value in payload.items()
        if key in WRITABLE_PROTOCOL_FIELDS
    }

    if not cleaned:
        raise HTTPException(status_code=400, detail="Nenhum campo valido para salvar.")

    return cleaned


def _write_protocol(write_fn, payload):
    try:
        return write_fn(payload)
    except RuntimeError as error:
        message = str(error)
        missing_optional = [
            field for field in OPTIONAL_PROTOCOL_FIELDS
            if field in payload and field in message
        ]
        if not missing_optional:
            raise HTTPException(status_code=500, detail=message) from error

    retry_payload = {
        key: value
        for key, value in payload.items()
        if key not in OPTIONAL_PROTOCOL_FIELDS
    }

    try:
        return write_fn(retry_payload)
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


def _ensure_updated_at(payload):
    return {
        **payload,
        "updated_at": agora_iso(),
    }


@app.get("/")
def home():
    return {
        "ok": True,
        "service": "bpk-scraping-api",
        "consultas_status": "/api/consultas/status",
        "consultas_executar": "/api/consultas/executar",
    }


@app.get("/api/protocolos")
def listar_protocolos_api():
    return supabase_select(
        "protocolos",
        {
            "select": "*",
            "ativo": "is.true",
            "order": "ultima_consulta.desc.nullslast",
        },
    )


@app.post("/api/protocolos")
def criar_protocolo_api(payload: dict):
    protocolo = _clean_protocol_payload(payload)
    protocolo.setdefault("ativo", True)
    if not protocolo.get("numero_protocolo"):
        raise HTTPException(status_code=400, detail="numero_protocolo e obrigatorio.")
    return _write_protocol(
        lambda body: supabase_insert("protocolos", body),
        protocolo,
    )


@app.patch("/api/protocolos/{protocol_id}")
def atualizar_protocolo_api(protocol_id: str, payload: dict):
    protocolo = _ensure_updated_at(_clean_protocol_payload(payload))
    resposta = _write_protocol(
        lambda body: supabase_update("protocolos", {"id": f"eq.{protocol_id}"}, body),
        protocolo,
    )
    if not resposta:
        raise HTTPException(status_code=404, detail="Protocolo nao encontrado.")
    return resposta


@app.delete("/api/protocolos/{protocol_id}")
def remover_protocolo_api(protocol_id: str):
    resposta = supabase_update(
        "protocolos",
        {"id": f"eq.{protocol_id}"},
        {"ativo": False, "updated_at": agora_iso()},
    )
    if not resposta:
        raise HTTPException(status_code=404, detail="Protocolo nao encontrado.")
    return {"ok": True, "id": protocol_id, "protocol": resposta[0]}


@app.get("/api/projetos")
def listar_projetos_api():
    return supabase_select(
        "projetos",
        {
            "select": "*",
            "order": "nome.asc",
        },
    )


@app.get("/api/empresas")
def listar_empresas_api():
    return supabase_select(
        "empresas",
        {
            "select": "*",
            "order": "nome.asc",
        },
    )


@app.get("/api/historico")
def listar_historico_api():
    return supabase_select(
        "historico_consultas",
        {
            "select": "*",
            "order": "data_consulta.desc",
        },
    )

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase

from scraping_prefeitura_toledo.main import executar_bot_prefeitura

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"mensagem": "api funcionando"}


# =========================
# SCRAPING
# =========================

@app.post("/api/consultas/executar")
def executar_consultas(payload: dict | None = None):

    limit = None

    if payload:
        limit = payload.get("limit")

    executar_bot_prefeitura(
        limit=limit,
        headless=True
    )

    return {
        "executed": True,
        "message": "Scraping executado com sucesso"
    }


# =========================
# PROTOCOLOS
# =========================

@app.get("/api/protocolos")
def listar_protocolos():

    response = (
        supabase
        .table("protocolos")
        .select("*")
        .order("updated_at", desc=True)
        .execute()
    )

    return response.data


# =========================
# EMPRESAS
# =========================

@app.get("/api/empresas")
def listar_empresas():

    response = (
        supabase
        .table("empresas")
        .select("*")
        .execute()
    )

    return response.data


# =========================
# PROJETOS
# =========================

@app.get("/api/projetos")
def listar_projetos():

    response = (
        supabase
        .table("projetos")
        .select("*")
        .execute()
    )

    return response.data


# =========================
# HISTORICO
# =========================

@app.get("/api/historico")
def listar_historico():

    response = (
        supabase
        .table("historico_consultas")
        .select("*")
        .execute()
    )

    return response.data

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase

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


def buscar_protocolos():
    response = supabase.table("protocolos").select(
        "id, numero_protocolo, orgao, responsavel, atividade, status_atual, situacao, ativo"
    ).limit(50).execute()

    return response.data


@app.get("/protocolos")
def listar_protocolos():
    return buscar_protocolos()


@app.get("/api/protocolos")
def listar_protocolos_api():
    return buscar_protocolos()

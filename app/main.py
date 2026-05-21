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
    response = (
        supabase
        .table("protocolos")
        .select(
            "id, projeto_id, empresa_id, numero_protocolo, orgao, responsavel, atividade, status_atual, situacao, ativo"
        )
        .limit(50)
        .execute()
    )
    return response.data


@app.get("/api/protocolos")
def listar_protocolos_api():
    return buscar_protocolos()


@app.post("/api/protocolos")
def criar_protocolo(dados: dict):
    response = (
        supabase
        .table("protocolos")
        .insert(dados)
        .execute()
    )
    return response.data


@app.patch("/api/protocolos/{protocolo_id}")
def editar_protocolo(protocolo_id: str, dados: dict):
    response = (
        supabase
        .table("protocolos")
        .update(dados)
        .eq("id", protocolo_id)
        .execute()
    )
    return response.data


@app.delete("/api/protocolos/{protocolo_id}")
def excluir_protocolo(protocolo_id: str):
    response = (
        supabase
        .table("protocolos")
        .delete()
        .eq("id", protocolo_id)
        .execute()
    )
    return {"mensagem": "protocolo excluido", "dados": response.data}


@app.get("/api/projetos")
def listar_projetos_api():
    response = supabase.table("projetos").select("*").limit(50).execute()
    return response.data


@app.get("/api/empresas")
def listar_empresas_api():
    response = supabase.table("empresas").select("*").limit(50).execute()
    return response.data


@app.get("/api/historico")
def listar_historico_api():
    response = supabase.table("historico_consultas").select("*").limit(50).execute()
    return response.data

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase

app = FastAPI()

# cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# rota inicial
@app.get("/")
def home():
    return {"mensagem": "api funcionando"}

# função reutilizável
def buscar_protocolos():
    response = (
        supabase
        .table("protocolos")
        .select(
            "id, numero_protocolo, orgao, responsavel, atividade, status_atual, situacao, ativo"
        )
        .limit(50)
        .execute()
    )

    return response.data

# rota normal
@app.get("/protocolos")
def listar_protocolos():
    return buscar_protocolos()

# rota api
@app.get("/api/protocolos")
def listar_protocolos_api():
    return buscar_protocolos()

# projetos
@app.get("/api/projetos")
def listar_projetos_api():
    response = (
        supabase
        .table("projetos")
        .select("*")
        .limit(50)
        .execute()
    )

    return response.data

# empresas
@app.get("/api/empresas")
def listar_empresas_api():
    response = (
        supabase
        .table("empresas")
        .select("*")
        .limit(50)
        .execute()
    )

    return response.data

# historico
@app.get("/api/historico")
def listar_historico_api():
    response = (
        supabase
        .table("historico")
        .select("*")
        .limit(50)
        .execute()
    )

    return response.data

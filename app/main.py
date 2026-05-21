from fastapi import FastAPI
from app.database import supabase

app = FastAPI()


@app.get("/")
def home():
    return {"mensagem": "api funcionando"}


@app.get("/protocolos")
def listar_protocolos():
    response = supabase.table("protocolos").select(
        "id, numero_protocolo, orgao, responsavel, atividade, status_atual, situacao, ativo"
    ).execute()

    return response.data


@app.get("/projetos")
def listar_projetos():
    response = supabase.table("projetos").select("*").execute()

    return response.data


@app.get("/empresas")
def listar_empresas():
    response = supabase.table("empresas").select("*").execute()

    return response.data


@app.get("/historico")
def listar_historico():
    response = supabase.table("historico_consultas").select("*").execute()

    return response.data

from fastapi import FastAPI
from app.database import supabase

app = FastAPI()


@app.get("/")
def home():
    return {"mensagem": "api funcionando"}


@app.get("/protocolos")
def listar_protocolos():
    response = supabase.table("protocolos").select("*").execute()

    return response.data

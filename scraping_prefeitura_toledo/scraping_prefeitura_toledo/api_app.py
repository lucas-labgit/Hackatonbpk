from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .api_router import router as consultas_router
    from .database import supabase_select
except ImportError:
    from api_router import router as consultas_router
    from database import supabase_select


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


@app.get("/api/historico")
def listar_historico_api():
    return supabase_select(
        "historico_consultas",
        {
            "select": "*",
            "order": "data_consulta.desc",
        },
    )

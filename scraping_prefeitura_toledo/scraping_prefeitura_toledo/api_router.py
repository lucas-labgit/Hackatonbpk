from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

try:
    from .database import status_configuracao
    from .main import executar_bot_prefeitura
except ImportError:
    from database import status_configuracao
    from main import executar_bot_prefeitura


router = APIRouter(prefix="/api/consultas", tags=["consultas"])


class ExecutarConsultasPayload(BaseModel):
    limit: Optional[int] = Field(default=None, ge=1)
    headless: bool = True
    background: bool = False
    responsavel: Optional[str] = None
    numero: Optional[str] = None


@router.get("/status")
def status_consultas():
    return {
        "ok": True,
        "scrapers": ["prefeitura_toledo"],
        **status_configuracao(),
    }


@router.post("/executar")
def executar_consultas(
    background_tasks: BackgroundTasks,
    payload: Optional[ExecutarConsultasPayload] = None,
):
    payload = payload or ExecutarConsultasPayload()

    if payload.background:
        background_tasks.add_task(
            executar_bot_prefeitura,
            limit=payload.limit,
            headless=payload.headless,
            responsavel=payload.responsavel,
            numero=payload.numero,
        )
        return {
            "executed": True,
            "scheduled": True,
            "items": [],
        }

    try:
        resumo = executar_bot_prefeitura(
            limit=payload.limit,
            headless=payload.headless,
            responsavel=payload.responsavel,
            numero=payload.numero,
        )
    except ValueError as erro:
        raise HTTPException(status_code=500, detail=str(erro)) from erro

    return {
        "executed": True,
        "scheduled": False,
        **resumo,
    }

import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", encoding="utf-8-sig")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL nao encontrada no .env")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY nao encontrada no .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def agora_iso():
    return datetime.now(timezone.utc).isoformat()


def buscar_protocolos_prefeitura(limit=None):
    query = (
        supabase.table("protocolos")
        .select(
            """
            id,
            numero_protocolo,
            link_consulta,
            tipo_consulta,
            status_atual,
            ativo
            """
        )
        .eq("ativo", True)
        .eq("tipo_consulta", "prefeitura_toledo")
        .order("ultima_consulta", desc=False)
    )

    if limit:
        query = query.limit(limit)

    resposta = query.execute()
    return resposta.data or []


def buscar_ultimo_historico(protocolo_id):
    resposta = (
        supabase.table("historico_consultas")
        .select(
            "status, status_anterior, observacao, data_movimentacao, "
            "data_consulta, mudou_status, erro, fonte"
        )
        .eq("protocolo_id", protocolo_id)
        .order("data_consulta", desc=True)
        .limit(1)
        .execute()
    )

    if resposta.data:
        return resposta.data[0]

    return None


def _status_anterior(protocolo):
    ultimo = buscar_ultimo_historico(protocolo["id"])
    if ultimo and ultimo.get("status"):
        return ultimo.get("status")

    return protocolo.get("status_atual")


def salvar_resultado_consulta(protocolo, resultado):
    """
    Insere uma linha em historico_consultas para toda tentativa.
    Em sucesso, atualiza status_atual, ultima_consulta e observacao_consulta.
    Em erro, atualiza apenas ultima_consulta para nao apagar status existente.
    """
    if not protocolo.get("id"):
        raise ValueError("Protocolo sem id; nao e possivel salvar historico.")

    resultado = resultado or {}
    consulta_em = agora_iso()

    status_anterior = _status_anterior(protocolo)
    status_novo = resultado.get("status") or None
    observacao = resultado.get("observacao") or None
    texto_bruto = resultado.get("texto_bruto") or None
    data_movimentacao = resultado.get("data_movimentacao") or None
    erro = resultado.get("erro") or None

    mudou_status = bool(
        erro is None
        and status_novo
        and (status_anterior or "").strip() != status_novo.strip()
    )

    historico = {
        "protocolo_id": protocolo["id"],
        "status": status_novo if erro is None else None,
        "status_anterior": status_anterior,
        "observacao": observacao,
        "texto_bruto": texto_bruto,
        "data_movimentacao": data_movimentacao,
        "data_consulta": consulta_em,
        "mudou_status": mudou_status,
        "erro": erro,
        "fonte": "prefeitura_toledo",
    }

    resposta_historico = (
        supabase.table("historico_consultas").insert(historico).execute()
    )

    update_protocolo = {"ultima_consulta": consulta_em}

    if erro is None:
        if status_novo:
            update_protocolo["status_atual"] = status_novo
        update_protocolo["observacao_consulta"] = observacao

    resposta_update = (
        supabase.table("protocolos")
        .update(update_protocolo)
        .eq("id", protocolo["id"])
        .execute()
    )

    return {
        "historico": resposta_historico.data,
        "protocolo": resposta_update.data,
        "mudou_status": mudou_status,
        "status_anterior": status_anterior,
        "salvo": True,
    }

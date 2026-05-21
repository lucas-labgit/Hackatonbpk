import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", encoding="utf-8-sig")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def status_configuracao():
    return {
        "env_path": str(BASE_DIR / ".env"),
        "supabase_url_configurada": bool(SUPABASE_URL),
        "supabase_key_configurada": bool(SUPABASE_KEY),
    }


def _supabase_headers(prefer=None):
    if not SUPABASE_URL:
        raise ValueError(f"SUPABASE_URL nao encontrada em {BASE_DIR / '.env'}")

    if not SUPABASE_KEY:
        raise ValueError(f"SUPABASE_KEY nao encontrada em {BASE_DIR / '.env'}")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _rest_url(table):
    if not SUPABASE_URL:
        raise ValueError(f"SUPABASE_URL nao encontrada em {BASE_DIR / '.env'}")
    return f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"


def supabase_select(table, params):
    resposta = requests.get(
        _rest_url(table),
        headers=_supabase_headers(),
        params=params,
        timeout=30,
    )
    if not resposta.ok:
        raise RuntimeError(f"Falha ao consultar {table}: {resposta.status_code} {resposta.text}")
    return resposta.json()


def supabase_insert(table, payload):
    resposta = requests.post(
        _rest_url(table),
        headers=_supabase_headers(prefer="return=representation"),
        json=payload,
        timeout=30,
    )
    if not resposta.ok:
        raise RuntimeError(f"Falha ao inserir em {table}: {resposta.status_code} {resposta.text}")
    return resposta.json()


def supabase_update(table, filters, payload):
    resposta = requests.patch(
        _rest_url(table),
        headers=_supabase_headers(prefer="return=representation"),
        params=filters,
        json=payload,
        timeout=30,
    )
    if not resposta.ok:
        raise RuntimeError(f"Falha ao atualizar {table}: {resposta.status_code} {resposta.text}")
    return resposta.json()


def agora_iso():
    return datetime.now(timezone.utc).isoformat()


def buscar_protocolos_prefeitura(limit=None, responsavel=None, numero=None):
    params = {
        "select": (
            "id,numero_protocolo,link_consulta,documento_consulta,"
            "tipo_consulta,status_atual,ativo"
        ),
        "ativo": "is.true",
        "tipo_consulta": "eq.prefeitura_toledo",
        "order": "ultima_consulta.asc.nullsfirst",
    }
    if responsavel:
        params["responsavel"] = f"ilike.*{responsavel}*"
    if numero:
        params["numero_protocolo"] = f"ilike.*{numero}*"
    if limit:
        params["limit"] = str(limit)

    try:
        return supabase_select("protocolos", params) or []
    except RuntimeError as erro:
        if "documento_consulta" not in str(erro):
            raise

    params["select"] = "id,numero_protocolo,link_consulta,tipo_consulta,status_atual,ativo"
    protocolos = supabase_select("protocolos", params) or []
    for protocolo in protocolos:
        protocolo.setdefault("documento_consulta", None)
    return protocolos


def buscar_ultimo_historico(protocolo_id):
    resposta = supabase_select(
        "historico_consultas",
        {
            "select": (
                "status,status_anterior,observacao,data_movimentacao,"
                "data_consulta,mudou_status,erro,fonte"
            ),
            "protocolo_id": f"eq.{protocolo_id}",
            "order": "data_consulta.desc",
            "limit": "1",
        },
    )

    if resposta:
        return resposta[0]

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

    resposta_historico = supabase_insert("historico_consultas", historico)

    update_protocolo = {"ultima_consulta": consulta_em}

    if erro is None:
        if status_novo:
            update_protocolo["status_atual"] = status_novo
        update_protocolo["observacao_consulta"] = observacao

    resposta_update = supabase_update(
        "protocolos",
        {"id": f"eq.{protocolo['id']}"},
        update_protocolo,
    )

    return {
        "historico": resposta_historico,
        "protocolo": resposta_update,
        "mudou_status": mudou_status,
        "status_anterior": status_anterior,
        "salvo": True,
    }

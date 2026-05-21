import json
import os
from urllib.error import URLError
from urllib.request import urlopen

try:
    from .database import buscar_protocolos_prefeitura, status_configuracao
except ImportError:
    from database import buscar_protocolos_prefeitura, status_configuracao


API_BASE_URL = os.getenv("API_BASE_URL", "https://hackatonbpk-1.onrender.com").rstrip("/")


def buscar_json(url):
    with urlopen(url, timeout=20) as resposta:
        return json.loads(resposta.read().decode("utf-8"))


def diagnosticar_api_publica():
    print("API publica:", API_BASE_URL)
    try:
        openapi = buscar_json(f"{API_BASE_URL}/openapi.json")
    except URLError as erro:
        print("Nao consegui ler openapi.json:", erro)
        return

    paths = sorted((openapi.get("paths") or {}).keys())
    print("Rotas publicadas:", ", ".join(paths))
    print(
        "Rota de scraping publicada:",
        "/api/consultas/executar" in paths,
    )


def diagnosticar_supabase():
    status = status_configuracao()
    print("Arquivo .env esperado:", status["env_path"])
    print("SUPABASE_URL configurada:", status["supabase_url_configurada"])
    print("SUPABASE_KEY configurada:", status["supabase_key_configurada"])

    if not status["supabase_url_configurada"] or not status["supabase_key_configurada"]:
        return

    protocolos = buscar_protocolos_prefeitura(limit=5)
    print("Protocolos prontos para scraping:", len(protocolos))
    for protocolo in protocolos:
        print(
            "-",
            protocolo.get("numero_protocolo"),
            "| link:",
            "sim" if protocolo.get("link_consulta") else "nao",
            "| documento:",
            "sim" if protocolo.get("documento_consulta") else "nao",
        )


if __name__ == "__main__":
    diagnosticar_api_publica()
    print("-" * 72)
    diagnosticar_supabase()

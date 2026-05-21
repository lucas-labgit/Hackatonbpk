import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

resposta = (
    supabase
    .table("protocolos")
    .select("id, numero_protocolo, status_atual")
    .eq("ativo", True)
    .limit(1)
    .execute()
)

if not resposta.data:
    print("Nenhum protocolo encontrado.")
    exit()

protocolo = resposta.data[0]

print("Protocolo encontrado:")
print(protocolo)

status_anterior = protocolo.get("status_atual")
status_novo = "Teste de scraping"

historico = {
    "protocolo_id": protocolo["id"],
    "status": status_novo,
    "status_anterior": status_anterior,
    "observacao": "Teste de gravação feito pelo bot Python.",
    "texto_bruto": "Texto bruto de teste.",
    "data_movimentacao": None,
    "data_consulta": datetime.now().isoformat(),
    "mudou_status": status_anterior != status_novo,
    "erro": None,
    "fonte": "teste_mock_prefeitura"
}

resposta_historico = (
    supabase
    .table("historico_consultas")
    .insert(historico)
    .execute()
)

supabase.table("protocolos").update({
    "status_atual": status_novo
}).eq("id", protocolo["id"]).execute()

print("Histórico inserido:")
print(resposta_historico.data)

print("Status atualizado em protocolos.")

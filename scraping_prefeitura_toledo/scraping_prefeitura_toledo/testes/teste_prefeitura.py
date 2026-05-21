import os
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
    .select("id, numero_protocolo, orgao, tipo_consulta, link_consulta, status_atual")
    .eq("ativo", True)
    .eq("tipo_consulta", "prefeitura_toledo")
    .execute()
)

protocolos = resposta.data

print("Protocolos da Prefeitura encontrados:", len(protocolos))

for protocolo in protocolos[:10]:
    print(protocolo)

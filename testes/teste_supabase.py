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
    .select("id, numero_protocolo, orgao, tipo_consulta, link_consulta, status_atual", count="exact")
    .limit(10)
    .execute()
)

print("Conexão com Supabase funcionando.")
print("Total de registros na tabela protocolos:", resposta.count)
print("Registros retornados:", len(resposta.data))

for item in resposta.data:
    print(item)

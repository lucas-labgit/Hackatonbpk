import argparse
import traceback

from database import buscar_protocolos_prefeitura, salvar_resultado_consulta
from scraper_prefeitura import consultar_prefeitura


def imprimir_resultado(numero, resultado, salvamento):
    print(f"Protocolo consultado: {numero}")
    print(f"Status encontrado: {resultado.get('status')}")
    print(f"Observacao: {resultado.get('observacao')}")
    print(f"Data movimentacao: {resultado.get('data_movimentacao')}")
    print(f"Status anterior: {salvamento.get('status_anterior')}")
    print(f"Mudou status: {salvamento.get('mudou_status')}")
    print(f"Salvou no banco: {salvamento.get('salvo')}")


def executar_bot_prefeitura(limit=None, headless=False):
    protocolos = buscar_protocolos_prefeitura(limit=limit)

    print(f"Protocolos da Prefeitura encontrados: {len(protocolos)}")

    if not protocolos:
        print("Nenhum protocolo encontrado com tipo_consulta = prefeitura_toledo.")
        return

    for indice, protocolo in enumerate(protocolos, start=1):
        numero = protocolo.get("numero_protocolo")

        print("-" * 72)
        print(f"[{indice}/{len(protocolos)}] Consultando protocolo: {numero}")

        try:
            resultado = consultar_prefeitura(protocolo, headless=headless)
        except Exception as erro:
            resultado = {
                "status": None,
                "observacao": None,
                "data_movimentacao": None,
                "texto_bruto": None,
                "erro": f"{type(erro).__name__}: {erro}",
            }

        try:
            salvamento = salvar_resultado_consulta(protocolo, resultado)
        except Exception as erro_banco:
            print("Falha ao salvar no Supabase.")
            print(f"Erro banco: {type(erro_banco).__name__}: {erro_banco}")
            traceback.print_exc()
            continue

        if resultado.get("erro"):
            print(f"Erro na consulta: {resultado['erro']}")

        imprimir_resultado(numero, resultado, salvamento)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Consulta protocolos da Prefeitura de Toledo e salva no Supabase."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Quantidade de protocolos para consultar. Padrao: 0, consulta todos.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Executa o navegador sem janela.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    limite = None if args.limit == 0 else args.limit
    executar_bot_prefeitura(limit=limite, headless=args.headless)

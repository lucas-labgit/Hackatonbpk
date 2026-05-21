import argparse

from scraper_copel import consultar_copel


def parse_args():
    parser = argparse.ArgumentParser(description="Testa uma consulta avulsa da Copel.")
    parser.add_argument("numero_servico", help="Numero do servico da Copel.")
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Executa o navegador sem janela.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    resultado = consultar_copel(
        {"numero_protocolo": args.numero_servico, "link_consulta": None},
        headless=args.headless,
    )

    print(f"Numero do servico: {args.numero_servico}")
    print(f"Status: {resultado.get('status')}")
    print(f"Observacao: {resultado.get('observacao')}")
    print(f"Data movimentacao: {resultado.get('data_movimentacao')}")
    print(f"Erro: {resultado.get('erro')}")

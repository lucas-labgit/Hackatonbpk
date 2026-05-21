import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait
from dotenv import load_dotenv
from webdriver_manager.microsoft import EdgeChromiumDriverManager


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(ROOT_DIR / ".env", encoding="utf-8-sig")

DEBUG_DIR = BASE_DIR / "debug"
DEBUG_DIR.mkdir(exist_ok=True)
CPF_CNPJ_PADRAO = os.getenv("PREFEITURA_TOLEDO_CPF_CNPJ", "35.538.973/0001-63")


def normalizar_texto(texto):
    texto = "" if texto is None else str(texto)
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", texto).strip().lower()


def limpar_valor(texto):
    if texto is None:
        return None
    texto = re.sub(r"\s+", " ", str(texto)).strip()
    return texto or None


def separar_processo_exercicio(numero_protocolo):
    if not numero_protocolo:
        raise ValueError("Numero do protocolo vazio.")

    texto = re.sub(r"\s+", "", str(numero_protocolo).strip())

    match = re.fullmatch(r"(\d+)[/-](\d{4})", texto)
    if not match:
        raise ValueError(
            f"Formato de protocolo invalido: {numero_protocolo}. "
            "Use algo como 49428/2023."
        )

    return match.group(1), match.group(2)


def criar_driver(headless=False):
    options = Options()

    if headless:
        options.add_argument("--headless=new")

    options.add_argument("--start-maximized")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    service = Service(EdgeChromiumDriverManager().install())
    return webdriver.Edge(service=service, options=options)


def salvar_debug(driver, numero_protocolo, etapa):
    seguro = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(numero_protocolo or "sem_numero"))
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    png_path = DEBUG_DIR / f"{timestamp}_{seguro}_{etapa}.png"
    html_path = DEBUG_DIR / f"{timestamp}_{seguro}_{etapa}.html"

    try:
        driver.save_screenshot(str(png_path))
    except Exception:
        png_path = None

    try:
        html_path.write_text(driver.page_source, encoding="utf-8")
    except Exception:
        html_path = None

    return png_path, html_path


def encontrar_primeiro(driver, wait, seletores, descricao):
    ultimo_erro = None

    for by, valor in seletores:
        try:
            return wait.until(EC.presence_of_element_located((by, valor)))
        except Exception as erro:
            ultimo_erro = erro

    raise Exception(f"Nao encontrei o campo {descricao}. Ultimo erro: {ultimo_erro}")


def encontrar_botao_por_texto(driver, texto):
    texto_norm = normalizar_texto(texto)

    for elemento in driver.find_elements(By.XPATH, "//button|//input"):
        tipo = (elemento.get_attribute("type") or "").lower()
        valor = elemento.text or elemento.get_attribute("value") or ""

        if elemento.tag_name.lower() == "input" and tipo not in ["submit", "button"]:
            continue

        if texto_norm in normalizar_texto(valor):
            return elemento

    raise Exception(f"Botao com texto '{texto}' nao encontrado.")


def aceitar_cookies_se_aparecer(driver):
    try:
        botoes = driver.find_elements(By.XPATH, "//button")
        for botao in botoes:
            if "aceitar" in normalizar_texto(botao.text):
                botao.click()
                return True
    except Exception:
        pass

    return False


def selecionar_entidade_municipio(driver, wait):
    wait.until(
        lambda d: any(
            len(select.find_elements(By.TAG_NAME, "option")) > 0
            for select in d.find_elements(By.TAG_NAME, "select")
        )
    )

    selects = driver.find_elements(By.TAG_NAME, "select")

    if not selects:
        raise Exception("Nenhum campo select encontrado para Entidade.")

    for select_element in selects:
        select = Select(select_element)

        for option in select.options:
            option_norm = normalizar_texto(option.text)
            if "municipio de toledo" in option_norm:
                select.select_by_visible_text(option.text)
                driver.execute_script(
                    """
                    const el = arguments[0];
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                    """,
                    select_element,
                )
                return

    raise Exception("Opcao 'Municipio de Toledo' nao encontrada no select de Entidade.")


def esperar_botao_buscar_habilitado(driver, wait):
    def botao_habilitado(d):
        botao = encontrar_botao_por_texto(d, "Buscar")
        disabled = botao.get_attribute("disabled")
        aria_disabled = botao.get_attribute("aria-disabled")
        return botao if not disabled and aria_disabled != "true" and botao.is_enabled() else False

    return wait.until(botao_habilitado)


def preencher_cpf_cnpj(driver, protocolo):
    documento = (
        protocolo.get("cpf_cnpj")
        or protocolo.get("cnpj")
        or protocolo.get("cpf")
        or protocolo.get("documento")
        or protocolo.get("documento_consulta")
        or CPF_CNPJ_PADRAO
    )
    documento = limpar_valor(documento)

    if not documento:
        raise Exception("CPF/CNPJ nao informado para consulta.")

    campo = driver.find_element(By.ID, "documento")
    campo.clear()
    campo.send_keys(documento)

    # Angular nem sempre percebe send_keys em inputs customizados sem eventos.
    driver.execute_script(
        """
        const el = arguments[0];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        """,
        campo,
    )

    print(f"CPF/CNPJ preenchido: {documento}")


def parse_data_iso(texto):
    if not texto:
        return None

    match = re.search(r"(\d{2})/(\d{2})/(\d{4})", str(texto))
    if not match:
        return None

    dia, mes, ano = match.groups()

    try:
        return datetime(int(ano), int(mes), int(dia)).date().isoformat()
    except ValueError:
        return None


def extrair_pares_por_texto(texto):
    campos = {}
    labels = {
        "numero do processo": "numero_processo",
        "situacao do processo": "status",
        "data de ocorrencia": "data_ocorrencia",
        "requerente": "requerente",
        "cpf": "cpf",
        "cnpj": "cpf",
        "contato": "contato",
        "assunto": "assunto",
        "descricao": "descricao",
    }
    proximos_labels = sorted(labels.keys(), key=len, reverse=True)

    def cortar_em_proximo_label(valor):
        if not valor:
            return valor

        valor_sem_acento = unicodedata.normalize("NFKD", valor)
        valor_sem_acento = "".join(
            ch for ch in valor_sem_acento if not unicodedata.combining(ch)
        )

        cortes = []
        for proximo in proximos_labels:
            match = re.search(rf"\s+{re.escape(proximo)}\s*:?", valor_sem_acento, re.I)
            if match:
                cortes.append(match.start())

        if cortes:
            return valor[: min(cortes)]

        return valor

    linhas = [limpar_valor(linha) for linha in texto.splitlines()]
    linhas = [linha for linha in linhas if linha]

    for i, linha in enumerate(linhas):
        linha_norm = normalizar_texto(linha)

        for label, chave in labels.items():
            if not linha_norm.startswith(label):
                continue

            valor = None
            if ":" in linha:
                valor = linha.split(":", 1)[1].strip()
            elif "-" in linha and len(linha.split("-", 1)[0]) < 40:
                valor = linha.split("-", 1)[1].strip()
            elif i + 1 < len(linhas):
                valor = linhas[i + 1]

            valor = limpar_valor(valor)
            if valor:
                campos[chave] = limpar_valor(cortar_em_proximo_label(valor))

    # Fallback para layouts que colocam tudo em uma linha so.
    regexes = {
        "status": r"Situacao do processo\s*:?\s*(.+?)(?=\s+(Data de ocorrencia|Requerente|CPF|CNPJ|Contato|Assunto|Descricao)\s*:|$)",
        "data_ocorrencia": r"Data de ocorrencia\s*:?\s*(\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2})?)",
        "descricao": r"Descricao\s*:?\s*(.+?)(?=\s+(Documento|Data|Etapa|Local|Previsao)\s*:|$)",
    }
    texto_norm_sem_acento = unicodedata.normalize("NFKD", texto)
    texto_norm_sem_acento = "".join(
        ch for ch in texto_norm_sem_acento if not unicodedata.combining(ch)
    )

    for chave, padrao in regexes.items():
        if campos.get(chave):
            continue
        match = re.search(padrao, texto_norm_sem_acento, flags=re.I | re.S)
        if match:
            campos[chave] = limpar_valor(match.group(1))

    return campos


def _mapear_cabecalhos(cabecalhos):
    mapa = {}
    for indice, cabecalho in enumerate(cabecalhos):
        nome = normalizar_texto(cabecalho)
        if "data" == nome or nome.startswith("data"):
            mapa["data"] = indice
        elif "descricao" in nome:
            mapa["descricao"] = indice
        elif "documento" in nome:
            mapa["documento"] = indice
        elif "etapa" in nome:
            mapa["etapa"] = indice
        elif "local" in nome:
            mapa["local"] = indice
        elif "previsao" in nome:
            mapa["previsao"] = indice
    return mapa


def extrair_movimentacoes(driver):
    movimentacoes = []

    movimentacoes.extend(extrair_movimentacoes_devextreme(driver))

    for tabela in driver.find_elements(By.TAG_NAME, "table"):
        linhas = tabela.find_elements(By.TAG_NAME, "tr")
        if len(linhas) < 2:
            continue

        cabecalhos = [th.text for th in linhas[0].find_elements(By.XPATH, ".//th|.//td")]
        mapa = _mapear_cabecalhos(cabecalhos)

        if "data" not in mapa or "descricao" not in mapa:
            continue

        for linha in linhas[1:]:
            celulas = [limpar_valor(td.text) for td in linha.find_elements(By.TAG_NAME, "td")]
            if not celulas:
                continue

            def celula(chave):
                indice = mapa.get(chave)
                if indice is None or indice >= len(celulas):
                    return None
                return celulas[indice]

            data_texto = celula("data")
            descricao = celula("descricao")

            if not data_texto and not descricao:
                continue

            movimentacoes.append(
                {
                    "data_texto": data_texto,
                    "data_iso": parse_data_iso(data_texto),
                    "descricao": descricao,
                    "linha": " | ".join(c for c in celulas if c),
                }
            )

    return movimentacoes


def extrair_movimentacoes_devextreme(driver):
    movimentacoes = []
    seletores_linha = [
        "//*[contains(concat(' ', normalize-space(@class), ' '), ' dx-data-row ')]",
        "//*[contains(concat(' ', normalize-space(@class), ' '), ' dx-row ')]"
        "[.//td and not(contains(concat(' ', normalize-space(@class), ' '), ' dx-header-row '))]",
    ]

    linhas = []
    for seletor in seletores_linha:
        linhas = driver.find_elements(By.XPATH, seletor)
        if linhas:
            break

    for linha in linhas:
        celulas_com_posicao = [
            limpar_valor(td.text) for td in linha.find_elements(By.XPATH, ".//td")
        ]
        celulas = [celula for celula in celulas_com_posicao if celula]

        if len(celulas) < 4:
            continue

        data_texto = None
        descricao = None

        if len(celulas_com_posicao) >= 6:
            data_texto = celulas_com_posicao[1]
            descricao = celulas_com_posicao[4]

        if not data_texto:
            data_texto = next((celula for celula in celulas if parse_data_iso(celula)), None)

        def parece_descricao(valor):
            valor_norm = normalizar_texto(valor)
            if not valor_norm:
                return False
            if parse_data_iso(valor):
                return False
            if valor_norm in ["protocolo"]:
                return False
            if valor_norm.startswith(("finaliza", "encaminha")):
                return False
            if valor_norm.startswith(("gabinete", "departamento", "secretaria")):
                return False
            return len(valor_norm) >= 12 or "[" in valor

        descricoes_possiveis = [
            celula
            for celula in celulas
            if celula != data_texto and parece_descricao(celula)
        ]

        if descricao and not parece_descricao(descricao):
            descricao = None

        if not descricao and len(celulas) >= 4 and parece_descricao(celulas[3]):
            descricao = celulas[3]
        if not descricao and descricoes_possiveis:
            descricao = max(descricoes_possiveis, key=len)

        if not data_texto and not descricao:
            continue

        movimentacoes.append(
            {
                "data_texto": data_texto,
                "data_iso": parse_data_iso(data_texto),
                "descricao": descricao,
                "linha": " | ".join(celulas),
            }
        )

    return movimentacoes


def escolher_ultima_movimentacao(movimentacoes):
    if not movimentacoes:
        return None

    com_data = [mov for mov in movimentacoes if mov.get("data_iso")]
    if com_data:
        return sorted(com_data, key=lambda mov: mov["data_iso"], reverse=True)[0]

    return movimentacoes[-1]


def extrair_resultado(driver):
    texto_pagina = driver.find_element(By.TAG_NAME, "body").text
    texto_bruto = driver.page_source[:20000]

    dados_processo = extrair_pares_por_texto(texto_pagina)
    movimentacoes = extrair_movimentacoes(driver)
    ultima_movimentacao = escolher_ultima_movimentacao(movimentacoes)

    status = dados_processo.get("status")
    descricao_processo = dados_processo.get("descricao")

    observacao = None
    data_movimentacao = None

    if ultima_movimentacao:
        observacao = ultima_movimentacao.get("descricao") or ultima_movimentacao.get("linha")
        data_movimentacao = ultima_movimentacao.get("data_iso")

    if not observacao:
        observacao = descricao_processo

    if not data_movimentacao:
        data_movimentacao = parse_data_iso(dados_processo.get("data_ocorrencia"))

    if not status:
        raise Exception(
            "Consulta carregou, mas nao encontrei 'Situacao do processo' na pagina."
        )

    return {
        "status": status,
        "observacao": observacao,
        "data_movimentacao": data_movimentacao,
        "texto_bruto": texto_bruto,
        "erro": None,
    }


def consultar_prefeitura(protocolo, headless=False):
    driver = None
    numero_protocolo = protocolo.get("numero_protocolo")
    link_consulta = protocolo.get("link_consulta")

    try:
        processo, exercicio = separar_processo_exercicio(numero_protocolo)

        if not link_consulta:
            raise Exception("link_consulta nao informado para este protocolo.")

        print(f"Abrindo URL: {link_consulta}")
        print(f"Processo: {processo} | Exercicio: {exercicio}")

        driver = criar_driver(headless=headless)
        wait = WebDriverWait(driver, 25)
        driver.get(link_consulta)
        aceitar_cookies_se_aparecer(driver)

        campo_processo = encontrar_primeiro(
            driver,
            wait,
            [
                (By.XPATH, "//input[@placeholder='Ex.: 123']"),
                (By.XPATH, "//label[contains(., 'Processo')]/following::input[1]"),
                (By.NAME, "processo"),
                (By.ID, "processo"),
                (By.NAME, "numero"),
                (By.ID, "numero"),
            ],
            "Processo",
        )
        campo_processo.clear()
        campo_processo.send_keys(processo)

        campo_exercicio = encontrar_primeiro(
            driver,
            wait,
            [
                (By.XPATH, "//input[@placeholder='Ex.: 2019']"),
                (By.XPATH, "//label[contains(., 'Exerc')]/following::input[1]"),
                (By.NAME, "exercicio"),
                (By.ID, "exercicio"),
                (By.NAME, "ano"),
                (By.ID, "ano"),
            ],
            "Exercicio",
        )
        campo_exercicio.clear()
        campo_exercicio.send_keys(exercicio)

        preencher_cpf_cnpj(driver, protocolo)
        selecionar_entidade_municipio(driver, wait)

        botao_buscar = esperar_botao_buscar_habilitado(driver, wait)
        botao_buscar.click()

        wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
        wait.until(
            lambda d: any(
                marcador in normalizar_texto(d.find_element(By.TAG_NAME, "body").text)
                for marcador in ["situacao do processo", "data de ocorrencia"]
            )
        )
        try:
            WebDriverWait(driver, 10).until(lambda d: len(extrair_movimentacoes(d)) > 0)
        except Exception:
            pass

        return extrair_resultado(driver)

    except Exception as erro:
        png_path = None
        html_path = None
        texto_bruto = None
        url_atual = None

        if driver:
            png_path, html_path = salvar_debug(driver, numero_protocolo, "erro")
            texto_bruto = driver.page_source[:20000]
            try:
                url_atual = driver.current_url
            except Exception:
                url_atual = None

        return {
            "status": None,
            "observacao": None,
            "data_movimentacao": None,
            "texto_bruto": texto_bruto,
            "erro": (
                f"{type(erro).__name__}: {erro}. "
                f"Debug PNG: {png_path}. Debug HTML: {html_path}. "
                f"URL atual: {url_atual}"
            ),
        }

    finally:
        if driver:
            driver.quit()

import re

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scraper_prefeitura import (
    criar_driver,
    limpar_valor,
    normalizar_texto,
    parse_data_iso,
    salvar_debug,
)


URL_COPEL = (
    "https://www.copel.com/site/copel-distribuicao/"
    "acompanhamento-de-solicitacoes/"
)
URL_COPEL_FORMULARIO = "https://www.copel.com/slwweb/publico/acompanhamento/inicio.jsf"


def limpar_numero_servico(numero_servico):
    if not numero_servico:
        raise ValueError("Numero do servico vazio.")

    numero = re.sub(r"\D+", "", str(numero_servico))
    if not numero:
        raise ValueError(f"Numero do servico invalido: {numero_servico}")

    return numero


def encontrar_campo_servico(driver, wait):
    seletores = [
        (By.ID, "formPrincipal:j_idt23"),
        (By.NAME, "formPrincipal:j_idt23"),
        (By.XPATH, "//label[contains(., 'Numero do servico')]/following::input[1]"),
        (By.XPATH, "//label[contains(., 'Número do serviço')]/following::input[1]"),
        (By.CSS_SELECTOR, "input.ui-inputmask"),
    ]

    ultimo_erro = None
    for by, valor in seletores:
        try:
            return wait.until(EC.presence_of_element_located((by, valor)))
        except Exception as erro:
            ultimo_erro = erro

    raise Exception(f"Nao encontrei o campo Numero do servico. Ultimo erro: {ultimo_erro}")


def entrar_no_formulario_copel(driver, wait):
    try:
        encontrar_campo_servico(driver, WebDriverWait(driver, 3))
        return
    except Exception:
        pass

    for iframe in driver.find_elements(By.TAG_NAME, "iframe"):
        src = iframe.get_attribute("src") or ""
        title = iframe.get_attribute("title") or ""

        if "acompanhamento/inicio.jsf" not in src and "Servicos Copel" not in title:
            continue

        driver.switch_to.frame(iframe)
        wait.until(EC.presence_of_element_located((By.ID, "formPrincipal:j_idt23")))
        return

    driver.get(URL_COPEL_FORMULARIO)
    wait.until(EC.presence_of_element_located((By.ID, "formPrincipal:j_idt23")))


def encontrar_botao_pesquisar(driver):
    texto_procurado = normalizar_texto("Pesquisar")

    for elemento in driver.find_elements(By.XPATH, "//button|//input"):
        tipo = (elemento.get_attribute("type") or "").lower()
        texto = elemento.text or elemento.get_attribute("value") or ""

        if elemento.tag_name.lower() == "input" and tipo not in ["submit", "button"]:
            continue

        if texto_procurado in normalizar_texto(texto):
            return elemento

    seletores = [
        "button[id^='formPrincipal']",
        ".ui-button",
        "input[type='submit']",
        "input[type='button']",
    ]
    for seletor in seletores:
        botoes = driver.find_elements(By.CSS_SELECTOR, seletor)
        if botoes:
            return botoes[0]

    raise Exception("Botao Pesquisar nao encontrado.")


def aguardar_resultado(driver, wait, texto_inicial):
    def carregando_visivel(d):
        seletores = [".modalAguarde", ".ui-dialog-mask", "#j_idt154"]
        for seletor in seletores:
            for elemento in d.find_elements(By.CSS_SELECTOR, seletor):
                try:
                    if elemento.is_displayed():
                        return True
                except Exception:
                    continue
        return False

    def pagina_mudou(d):
        body = d.find_element(By.TAG_NAME, "body").text
        body_norm = normalizar_texto(body)
        texto_inicial_norm = normalizar_texto(texto_inicial)

        marcadores = [
            "situacao",
            "status",
            "solicitacao",
            "servico",
            "protocolo",
            "ordens",
            "nenhum registro",
            "nao encontrado",
            "informe",
        ]

        return (
            normalizar_texto(body) != texto_inicial_norm
            and not carregando_visivel(d)
            and any(marcador in body_norm for marcador in marcadores)
        )

    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    WebDriverWait(driver, 90).until(lambda d: not carregando_visivel(d))
    wait.until(pagina_mudou)


def clicar_primeira_ordem_se_existir(driver):
    linhas_ordem = driver.find_elements(
        By.CSS_SELECTOR,
        "#formPrincipal\\:j_idt29_data tr.ui-datatable-selectable",
    )
    if not linhas_ordem:
        return False

    linhas_ordem[0].click()
    WebDriverWait(driver, 30).until(
        lambda d: d.find_elements(By.ID, "formPrincipal:pnlSituacoesInternas")
        or "em andamento" in normalizar_texto(d.find_element(By.TAG_NAME, "body").text)
        or "aguardando acao" in normalizar_texto(d.find_element(By.TAG_NAME, "body").text)
    )
    return True


def extrair_pares_por_linhas(texto):
    campos = {}
    labels = {
        "numero do servico": "numero_servico",
        "numero da solicitacao": "numero_solicitacao",
        "solicitacao": "numero_solicitacao",
        "protocolo": "protocolo",
        "situacao": "status",
        "status": "status",
        "etapa": "etapa",
        "servico": "servico",
        "descricao": "descricao",
        "data": "data_movimentacao",
        "data da solicitacao": "data_movimentacao",
        "previsao": "previsao",
    }

    linhas = [limpar_valor(linha) for linha in texto.splitlines()]
    linhas = [linha for linha in linhas if linha]

    for indice, linha in enumerate(linhas):
        linha_norm = normalizar_texto(linha)

        for label, chave in labels.items():
            if not linha_norm.startswith(label):
                continue

            valor = None
            if ":" in linha:
                valor = linha.split(":", 1)[1].strip()
            elif indice + 1 < len(linhas):
                valor = linhas[indice + 1]

            valor = limpar_valor(valor)
            if valor:
                campos[chave] = valor

    return campos


def extrair_tabelas(driver):
    linhas_extraidas = []

    for tabela in driver.find_elements(By.TAG_NAME, "table"):
        for tr in tabela.find_elements(By.TAG_NAME, "tr"):
            celulas = [
                limpar_valor(celula.text)
                for celula in tr.find_elements(By.XPATH, ".//th|.//td")
            ]
            celulas = [celula for celula in celulas if celula]
            if celulas:
                linhas_extraidas.append(" | ".join(celulas))

    return linhas_extraidas


def extrair_situacao_interna_copel(driver):
    paineis = driver.find_elements(By.ID, "formPrincipal:pnlSituacoesInternas")
    if not paineis:
        return None

    labels = []
    for label in paineis[0].find_elements(By.TAG_NAME, "label"):
        texto = limpar_valor(label.text)
        if texto:
            labels.append(texto)

    if not labels:
        return None

    status = None
    for label in labels:
        label_norm = normalizar_texto(label)
        if "impedida" in label_norm or "aguardando acao" in label_norm:
            status = label
            break

    if not status:
        status = labels[0]

    return {
        "status": status,
        "observacao": " | ".join(labels),
    }


def escolher_status(campos, linhas_tabela, texto_pagina):
    if campos.get("status"):
        return campos["status"]

    for linha in linhas_tabela:
        linha_norm = normalizar_texto(linha)
        if "situacao" in linha_norm or "status" in linha_norm:
            partes = [limpar_valor(parte) for parte in linha.split("|")]
            partes = [parte for parte in partes if parte]
            if len(partes) >= 2:
                return partes[-1]

    match = re.search(
        r"(Situacao|Status)\s*:?\s*(.+?)(?=\s{2,}|Data|Servico|Solicitacao|$)",
        texto_pagina,
        flags=re.I | re.S,
    )
    if match:
        return limpar_valor(match.group(2))

    return None


def extrair_resultado_copel(driver):
    texto_pagina = driver.find_element(By.TAG_NAME, "body").text
    texto_bruto = driver.page_source[:20000]
    campos = extrair_pares_por_linhas(texto_pagina)
    linhas_tabela = extrair_tabelas(driver)

    texto_norm = normalizar_texto(texto_pagina)
    mensagem_erro = extrair_mensagem_erro(driver) or extrair_mensagem_erro_texto(texto_pagina)
    if (
        "nenhum registro" in texto_norm
        or "nao encontrado" in texto_norm
        or "nao encontramos" in texto_norm
        or "verifique o numero digitado" in texto_norm
    ):
        return {
            "status": None,
            "observacao": mensagem_erro,
            "data_movimentacao": None,
            "texto_bruto": texto_bruto,
            "erro": mensagem_erro or "Solicitacao nao encontrada na Copel.",
            "fonte": "copel",
        }

    situacao_interna = extrair_situacao_interna_copel(driver)
    if situacao_interna:
        return {
            "status": situacao_interna["status"],
            "observacao": situacao_interna["observacao"],
            "data_movimentacao": parse_data_iso(texto_pagina),
            "texto_bruto": texto_bruto,
            "erro": None,
            "fonte": "copel",
        }

    status = escolher_status(campos, linhas_tabela, texto_pagina)
    observacao = (
        campos.get("descricao")
        or campos.get("etapa")
        or campos.get("servico")
        or (linhas_tabela[-1] if linhas_tabela else None)
    )
    data_movimentacao = parse_data_iso(
        campos.get("data_movimentacao") or "\n".join(linhas_tabela)
    )

    if not status:
        raise Exception("Consulta carregou, mas nao encontrei situacao/status na pagina.")

    return {
        "status": status,
        "observacao": observacao,
        "data_movimentacao": data_movimentacao,
        "texto_bruto": texto_bruto,
        "erro": None,
        "fonte": "copel",
    }


def extrair_mensagem_erro(driver):
    seletores = [
        ".ui-messages-error-summary",
        ".ui-messages-warn-summary",
        ".ui-message-error-detail",
        ".ui-message-warn-detail",
    ]

    for seletor in seletores:
        mensagens = [
            limpar_valor(elemento.text)
            for elemento in driver.find_elements(By.CSS_SELECTOR, seletor)
        ]
        mensagens = [mensagem for mensagem in mensagens if mensagem]
        if mensagens:
            return " | ".join(mensagens)

    return None


def extrair_mensagem_erro_texto(texto):
    match = re.search(
        r"(\d{2}:\d{2}:\d{2}\s+)?(Verifique o numero digitado.+?)(?=\s+Acompanhamento|\s+Numero do servico|$)",
        normalizar_texto(texto),
        flags=re.I | re.S,
    )
    if match:
        return limpar_valor(match.group(0))

    return None


def consultar_copel(protocolo, headless=False):
    driver = None
    numero_servico = protocolo.get("numero_protocolo")
    link_consulta = protocolo.get("link_consulta") or URL_COPEL

    try:
        numero_servico = limpar_numero_servico(numero_servico)

        print(f"Abrindo URL: {link_consulta}")
        print(f"Numero do servico: {numero_servico}")

        driver = criar_driver(headless=headless)
        wait = WebDriverWait(driver, 25)
        driver.get(link_consulta)
        entrar_no_formulario_copel(driver, wait)

        campo_servico = encontrar_campo_servico(driver, wait)
        texto_inicial = driver.find_element(By.TAG_NAME, "body").text

        campo_servico.clear()
        campo_servico.send_keys(numero_servico)

        botao_pesquisar = encontrar_botao_pesquisar(driver)
        botao_pesquisar.click()

        aguardar_resultado(driver, wait, texto_inicial)
        clicar_primeira_ordem_se_existir(driver)
        return extrair_resultado_copel(driver)

    except Exception as erro:
        png_path = None
        html_path = None
        texto_bruto = None
        url_atual = None

        if driver:
            png_path, html_path = salvar_debug(driver, numero_servico, "copel_erro")
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
            "fonte": "copel",
        }

    finally:
        if driver:
            driver.quit()

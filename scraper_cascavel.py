import re
import time
from random import uniform

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scraper_prefeitura import (
    criar_driver,
    encontrar_botao_por_texto,
    limpar_valor,
    normalizar_texto,
    parse_data_iso,
    salvar_debug,
)


URL_CASCAVEL = (
    "https://prefa.cascavel.pr.gov.br/autoatendimento/servicos/"
    "consulta-de-processo-digital/detalhar/1"
)

TEMPO_MINIMO_ACAO = 1.2
TEMPO_MAXIMO_ACAO = 2.8


def separar_processo_exercicio_cascavel(numero_protocolo):
    if not numero_protocolo:
        raise ValueError("Numero do protocolo vazio.")

    texto = re.sub(r"\s+", "", str(numero_protocolo).strip())
    match = re.fullmatch(r"(\d+)[/-](\d{4})", texto)

    if not match:
        raise ValueError(
            f"Formato de protocolo invalido: {numero_protocolo}. "
            "Use algo como 12345/2026."
        )

    return match.group(1), match.group(2)


def obter_codigo_verificador(protocolo):
    codigo = (
        protocolo.get("codigo_verificador")
        or protocolo.get("cod_verificador")
        or protocolo.get("codigo_consulta")
        or protocolo.get("codigo")
        or protocolo.get("verificador")
    )
    codigo = limpar_valor(codigo)

    if not codigo:
        raise ValueError("codigo_verificador nao informado para consulta em Cascavel.")

    return codigo


def aceitar_cookies_se_aparecer(driver):
    try:
        for botao in driver.find_elements(By.XPATH, "//button"):
            if "aceitar" in normalizar_texto(botao.text):
                botao.click()
                return True
    except Exception:
        pass

    return False


def pausar_acao(minimo=TEMPO_MINIMO_ACAO, maximo=TEMPO_MAXIMO_ACAO):
    time.sleep(uniform(minimo, maximo))


def preencher_input(driver, elemento, valor):
    elemento.clear()
    pausar_acao(0.4, 1.0)

    for caractere in str(valor):
        elemento.send_keys(caractere)
        time.sleep(uniform(0.08, 0.22))

    driver.execute_script(
        """
        const el = arguments[0];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        """,
        elemento,
    )
    pausar_acao(0.5, 1.3)


def captcha_visivel(driver):
    try:
        texto = normalizar_texto(driver.find_element(By.TAG_NAME, "body").text)
    except Exception:
        return False

    if "nao sou um robo" in texto:
        return True
    if "verificacao de acesso" in texto or "validar o captcha" in texto:
        return True

    for iframe in driver.find_elements(By.TAG_NAME, "iframe"):
        try:
            src = iframe.get_attribute("src") or ""
            title = normalizar_texto(iframe.get_attribute("title") or "")
            tamanho = iframe.size or {}

            eh_desafio = (
                "recaptcha/api2/bframe" in src
                or "recaptcha/api2/anchor" in src
                or "challenge" in title
                or "desafio" in title
                or "recaptcha" in title
            )
            if (
                eh_desafio
                and iframe.is_displayed()
                and tamanho.get("width", 0) > 100
                and tamanho.get("height", 0) > 100
            ):
                return True
        except Exception:
            continue

    return False


def aguardar_captcha_manual_se_aparecer(driver, headless):
    if not captcha_visivel(driver):
        return

    if headless:
        raise Exception(
            "Captcha apareceu na pagina. Rode com headless=False para resolver manualmente."
        )

    print("Captcha detectado. Resolva no navegador aberto; vou aguardar ate 2 minutos.")
    WebDriverWait(driver, 120).until(lambda d: not captcha_visivel(d))
    pausar_acao(1.0, 2.0)


def encontrar_input_por_label(driver, label):
    label_norm = normalizar_texto(label)
    candidatos = driver.find_elements(
        By.XPATH,
        "//label|//*[self::span or self::div or self::p][string-length(normalize-space()) < 80]",
    )

    for candidato in candidatos:
        if label_norm not in normalizar_texto(candidato.text):
            continue

        for xpath in [
            ".//following::input[not(@type='hidden')][1]",
            "./ancestor::*[self::div or self::section or self::form][1]//input[not(@type='hidden')][1]",
        ]:
            try:
                elemento = candidato.find_element(By.XPATH, xpath)
                tipo = (elemento.get_attribute("type") or "text").lower()
                if tipo not in ["search", "checkbox", "radio", "file", "range"]:
                    return elemento
            except Exception:
                continue

    raise Exception(f"Campo com label '{label}' nao encontrado.")


def encontrar_campo_cascavel(driver, wait, chave):
    seletores = {
        "numero": [
            (By.NAME, "numero"),
            (By.ID, "numero"),
            (By.CSS_SELECTOR, "input[name*='numero']"),
            (By.CSS_SELECTOR, "input[id*='numero']"),
            (By.XPATH, "//label[contains(., 'Número') or contains(., 'Numero')]/following::input[1]"),
        ],
        "exercicio": [
            (By.NAME, "exercicio"),
            (By.ID, "exercicio"),
            (By.NAME, "ano"),
            (By.ID, "ano"),
            (By.CSS_SELECTOR, "input[name*='exercicio']"),
            (By.CSS_SELECTOR, "input[id*='exercicio']"),
            (By.CSS_SELECTOR, "input[name*='ano']"),
            (By.CSS_SELECTOR, "input[id*='ano']"),
        ],
        "codigo": [
            (By.NAME, "codigo_verificador"),
            (By.ID, "codigo_verificador"),
            (By.CSS_SELECTOR, "input[name*='verificador']"),
            (By.CSS_SELECTOR, "input[id*='verificador']"),
            (By.CSS_SELECTOR, "input[name*='codigo']"),
            (By.CSS_SELECTOR, "input[id*='codigo']"),
            (By.XPATH, "//label[contains(., 'Verificador')]/following::input[1]"),
        ],
    }

    try:
        def buscar_campo(d):
            for by, valor in seletores[chave]:
                elementos = d.find_elements(by, valor)
                visiveis = [elemento for elemento in elementos if elemento.is_displayed()]
                if visiveis:
                    return visiveis[0]
                if elementos:
                    return elementos[0]
            return False

        return wait.until(buscar_campo)
    except Exception:
        label = {
            "numero": "Numero",
            "exercicio": "Ano",
            "codigo": "Verificador",
        }[chave]
        return encontrar_input_por_label(driver, label)


def campos_visiveis_de_consulta(driver):
    campos = []
    for campo in driver.find_elements(By.TAG_NAME, "input"):
        tipo = (campo.get_attribute("type") or "text").lower()
        nome = normalizar_texto(
            " ".join(
                filtro
                for filtro in [
                    campo.get_attribute("name"),
                    campo.get_attribute("id"),
                    campo.get_attribute("class"),
                    campo.get_attribute("aria-label"),
                    campo.get_attribute("placeholder"),
                ]
                if filtro
            )
        )

        if tipo in ["hidden", "search", "checkbox", "radio", "file", "range"]:
            continue
        if "pesquisa" in nome or "swal" in nome:
            continue
        if not campo.is_displayed():
            continue

        campos.append(campo)

    return sorted(campos, key=lambda el: (el.location.get("y", 0), el.location.get("x", 0)))


def preencher_formulario_cascavel(driver, wait, processo, exercicio, codigo_verificador):
    try:
        campo_numero = encontrar_campo_cascavel(driver, wait, "numero")
        campo_exercicio = encontrar_campo_cascavel(driver, wait, "exercicio")
        campo_codigo = encontrar_campo_cascavel(driver, wait, "codigo")
    except Exception:
        campos = campos_visiveis_de_consulta(driver)
        if len(campos) < 3:
            raise

        campo_numero, campo_exercicio, campo_codigo = campos[:3]

    preencher_input(driver, campo_numero, processo)
    preencher_input(driver, campo_exercicio, exercicio)
    preencher_input(driver, campo_codigo, codigo_verificador)


def continuar_navegador_incompativel_se_aparecer(driver):
    try:
        botoes = driver.find_elements(By.XPATH, "//button")
        for botao in botoes:
            texto = normalizar_texto(botao.text)
            if "continuar o acesso" in texto and botao.is_displayed():
                botao.click()
                pausar_acao(1.0, 2.0)
                return True
    except Exception:
        pass

    return False


def entrar_iframe_consulta_cascavel(driver, wait):
    driver.switch_to.default_content()

    def localizar_iframe(d):
        iframes = d.find_elements(By.TAG_NAME, "iframe")

        for iframe in iframes:
            src = iframe.get_attribute("src") or ""
            titulo = normalizar_texto(iframe.get_attribute("title") or "")
            if "consulta-de-processo-digital" in src or "iframe ipm" in titulo:
                return iframe

        return iframes[0] if iframes else False

    iframe = wait.until(localizar_iframe)
    wait.until(EC.frame_to_be_available_and_switch_to_it(iframe))
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    pausar_acao(2.0, 4.0)
    return iframe


def encontrar_botao_confirmar(driver):
    for texto in ["Confirmar", "Consultar", "Buscar", "Pesquisar"]:
        try:
            return encontrar_botao_por_texto(driver, texto)
        except Exception:
            continue

    for seletor in ["button[type='submit']", "input[type='submit']", ".btn-primary", ".ipm-button"]:
        botoes = driver.find_elements(By.CSS_SELECTOR, seletor)
        if botoes:
            return botoes[0]

    raise Exception("Botao de confirmacao nao encontrado.")


def extrair_mensagem_erro(driver, texto_pagina):
    seletores = [
        ".swal2-html-container",
        ".swal2-content",
        ".alert",
        ".alert-danger",
        ".alert-warning",
        ".error",
        ".erro",
    ]

    mensagens = []
    for seletor in seletores:
        for elemento in driver.find_elements(By.CSS_SELECTOR, seletor):
            texto = limpar_valor(elemento.text)
            if texto:
                mensagens.append(texto)

    if mensagens:
        return " | ".join(dict.fromkeys(mensagens))

    texto_norm = normalizar_texto(texto_pagina)
    marcadores = [
        "nao encontrado",
        "nenhum registro",
        "codigo verificador invalido",
        "processo nao localizado",
        "informe o numero",
        "informe o codigo",
        "campo obrigatorio",
        "nao foi possivel realizar a consulta",
        "verifique os valores informados",
    ]
    if any(marcador in texto_norm for marcador in marcadores):
        return limpar_valor(texto_pagina[:1000])

    return None


def extrair_pares_por_linhas(texto):
    campos = {}
    labels = {
        "numero": "numero_processo",
        "numero do processo": "numero_processo",
        "processo": "numero_processo",
        "situacao": "status",
        "situacao do processo": "status",
        "status": "status",
        "data": "data_movimentacao",
        "data de abertura": "data_movimentacao",
        "data de ocorrencia": "data_movimentacao",
        "ultima movimentacao": "observacao",
        "ultima tramitacao": "observacao",
        "movimentacao": "observacao",
        "requerente": "requerente",
        "assunto": "assunto",
        "descricao": "descricao",
        "observacao": "observacao",
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
            elif "-" in linha and len(linha.split("-", 1)[0]) < 40:
                valor = linha.split("-", 1)[1].strip()
            elif indice + 1 < len(linhas):
                valor = linhas[indice + 1]

            valor = limpar_valor(valor)
            if valor:
                campos[chave] = valor

    return campos


def extrair_linhas_tabelas(driver):
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
        r"(Situacao|Status)\s*:?\s*(.+?)(?=\s{2,}|Data|Assunto|Requerente|$)",
        texto_pagina,
        flags=re.I | re.S,
    )
    if match:
        return limpar_valor(match.group(2))

    return None


def extrair_resultado_cascavel(driver):
    texto_pagina = driver.find_element(By.TAG_NAME, "body").text
    texto_bruto = driver.page_source[:20000]
    mensagem_erro = extrair_mensagem_erro(driver, texto_pagina)

    if mensagem_erro:
        return {
            "status": None,
            "observacao": mensagem_erro,
            "data_movimentacao": None,
            "texto_bruto": texto_bruto,
            "erro": mensagem_erro,
            "fonte": "prefeitura_cascavel",
        }

    campos = extrair_pares_por_linhas(texto_pagina)
    linhas_tabela = extrair_linhas_tabelas(driver)

    status = escolher_status(campos, linhas_tabela, texto_pagina)
    observacao = (
        campos.get("observacao")
        or campos.get("descricao")
        or campos.get("assunto")
        or (linhas_tabela[-1] if linhas_tabela else None)
    )
    data_movimentacao = parse_data_iso(
        campos.get("data_movimentacao") or "\n".join(linhas_tabela) or texto_pagina
    )

    if not status:
        raise Exception("Consulta carregou, mas nao encontrei situacao/status na pagina.")

    return {
        "status": status,
        "observacao": observacao,
        "data_movimentacao": data_movimentacao,
        "texto_bruto": texto_bruto,
        "erro": None,
        "fonte": "prefeitura_cascavel",
    }


def aguardar_resultado(driver, texto_inicial):
    texto_inicial_norm = normalizar_texto(texto_inicial)

    def consulta_finalizada(d):
        texto = d.find_element(By.TAG_NAME, "body").text
        texto_norm = normalizar_texto(texto)

        if texto_norm == texto_inicial_norm:
            return False

        marcadores = [
            "situacao",
            "status",
            "processo",
            "requerente",
            "assunto",
            "movimentacao",
            "tramitacao",
            "nao encontrado",
            "nenhum registro",
            "codigo verificador",
            "invalido",
        ]
        return any(marcador in texto_norm for marcador in marcadores)

    WebDriverWait(driver, 60).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    WebDriverWait(driver, 60).until(consulta_finalizada)


def consultar_cascavel(protocolo, headless=False):
    driver = None
    numero_protocolo = protocolo.get("numero_protocolo")
    link_consulta = protocolo.get("link_consulta") or URL_CASCAVEL

    try:
        processo, exercicio = separar_processo_exercicio_cascavel(numero_protocolo)
        codigo_verificador = obter_codigo_verificador(protocolo)

        print(f"Abrindo URL: {link_consulta}")
        print(f"Processo: {processo} | Exercicio: {exercicio}")

        driver = criar_driver(headless=headless)
        wait = WebDriverWait(driver, 30)
        driver.get(link_consulta)
        wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
        pausar_acao(2.5, 5.0)
        aceitar_cookies_se_aparecer(driver)
        continuar_navegador_incompativel_se_aparecer(driver)
        pausar_acao(1.5, 3.0)
        aguardar_captcha_manual_se_aparecer(driver, headless)

        wait.until(
            lambda d: "consulta de processo digital"
            in normalizar_texto(d.find_element(By.TAG_NAME, "body").text)
        )
        entrar_iframe_consulta_cascavel(driver, wait)
        aguardar_captcha_manual_se_aparecer(driver, headless)

        texto_inicial = driver.find_element(By.TAG_NAME, "body").text
        pausar_acao(2.0, 4.0)
        preencher_formulario_cascavel(
            driver,
            wait,
            processo,
            exercicio,
            codigo_verificador,
        )

        botao_confirmar = encontrar_botao_confirmar(driver)
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", botao_confirmar)
        pausar_acao(1.5, 3.5)
        aguardar_captcha_manual_se_aparecer(driver, headless)
        wait.until(EC.element_to_be_clickable(botao_confirmar))
        botao_confirmar.click()

        pausar_acao(2.0, 4.0)
        aguardar_captcha_manual_se_aparecer(driver, headless)
        aguardar_resultado(driver, texto_inicial)
        return extrair_resultado_cascavel(driver)

    except Exception as erro:
        png_path = None
        html_path = None
        texto_bruto = None
        url_atual = None

        if driver:
            png_path, html_path = salvar_debug(driver, numero_protocolo, "cascavel_erro")
            try:
                texto_bruto = driver.page_source[:20000]
            except Exception:
                texto_bruto = None

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
            "fonte": "prefeitura_cascavel",
        }

    finally:
        if driver:
            driver.quit()

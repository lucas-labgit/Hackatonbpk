(function () {
  const config = window.BPK_CONFIG || {};
  const tokenKey = config.AUTH_TOKEN_KEY || "bpk_auth_token";
  const authEnabled = config.AUTH_ENABLED !== false;

  function apiBaseUrl() {
    return String(config.API_BASE_URL || "").replace(/\/+$/, "");
  }

  function scrapingApiBaseUrl() {
    return String(config.SCRAPING_API_BASE_URL || "").replace(/\/+$/, "");
  }

  function isEnabled() {
    const baseUrl = apiBaseUrl() || scrapingApiBaseUrl();
    return Boolean(baseUrl && baseUrl.startsWith("http") && !baseUrl.includes("COLE_A_URL"));
  }

  function endpoint(name, params = {}) {
    const template = config.ENDPOINTS?.[name] || name;
    return template.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(params[key] || ""));
  }

  async function request(name, options = {}) {
    if (!isEnabled()) {
      throw new Error("API nao configurada. Preencha API_BASE_URL em config.js.");
    }

    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    };
    const token = localStorage.getItem(tokenKey);
    if (authEnabled && token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${options.baseUrl || apiBaseUrl() || scrapingApiBaseUrl()}${endpoint(name, options.params)}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw new Error(
        "Falha de conexao com a API. Verifique API_BASE_URL/SCRAPING_API_BASE_URL, se a API esta online e se o CORS permite http://127.0.0.1:5500."
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      const detail = Array.isArray(data?.detail)
        ? data.detail.map((item) => `${(item.loc || []).join(".")}: ${item.msg}`).join("; ")
        : data?.detail;
      const message = typeof data === "object" ? data.message || data.error || detail : data;
      throw new Error(message || `Erro ${response.status} ao chamar API.`);
    }

    return data;
  }

  async function requestWithFallback(primaryName, fallbackNames = [], options = {}) {
    const names = [primaryName, ...fallbackNames].filter(Boolean);
    let lastError = null;

    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      try {
        return await request(name, options);
      } catch (error) {
        lastError = error;
        const message = String(error?.message || "");
        const isLast = index === names.length - 1;
        const mayTryFallback = /\b404\b/i.test(message) || /\b405\b/i.test(message) || /not found|method not allowed/i.test(message);
        if (!mayTryFallback || isLast) {
          throw error;
        }
      }
    }

    throw lastError || new Error("Falha ao chamar API.");
  }

  function listFromResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.protocols)) return data.protocols;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }

  function itemFromResponse(data, fallback) {
    if (Array.isArray(data)) return data[0] || fallback;
    if (data?.protocol) return data.protocol;
    if (Array.isArray(data?.dados)) return data.dados[0] || fallback;
    if (data?.data && !Array.isArray(data.data)) return data.data;
    return data || fallback;
  }

  async function login(companyId, password) {
    const data = await request("login", {
      method: "POST",
      body: { companyId, password },
    });
    const token = data?.token || data?.accessToken || data?.jwt;
    if (token) localStorage.setItem(tokenKey, token);
    return data;
  }

  async function getProtocols(companyId) {
    const baseUrl = scrapingApiBaseUrl() || undefined;
    const data = await request("protocolsByCompany", { params: { companyId }, baseUrl });
    return listFromResponse(data);
  }

  async function getProjects() {
    const baseUrl = scrapingApiBaseUrl() || undefined;
    const data = await request("projects", { baseUrl });
    return listFromResponse(data);
  }

  async function getCompanies() {
    const baseUrl = scrapingApiBaseUrl() || undefined;
    const data = await request("companies", { baseUrl });
    return listFromResponse(data);
  }

  function backendProtocolPayload(companyId, protocol) {
    const empresaId = protocol.companyId || protocol.empresa_id || companyId;
    const projetoId = protocol.projectId || protocol.projeto_id || protocol.project_id;
    const queryType = protocol.queryType || protocol.tipo_consulta || "";
    const queryUrl = protocol.queryUrl || protocol.link_consulta || "";
    const documentoConsulta =
      protocol.documentoConsulta ||
      protocol.documento_consulta ||
      protocol.document ||
      protocol.documento ||
      "";
    const payload = {
      empresa_id: empresaId,
      projeto_id: projetoId,
      numero_protocolo: protocol.number || protocol.numero_protocolo,
      orgao: protocol.organ || protocol.orgao,
      responsavel: protocol.person || protocol.responsavel,
      atividade: protocol.subject || protocol.atividade,
      status_atual: protocol.statusCurrent || protocol.status_atual || protocol.status,
      situacao: protocol.notes || protocol.situacao || protocol.situationRaw || "",
      anotacoes: protocol.notes || protocol.anotacoes || "",
      data_abertura: protocol.openedAt || protocol.data_abertura || null,
      ativo: protocol.ativo ?? true,
    };

    if (queryType) payload.tipo_consulta = queryType;
    if (queryUrl) payload.link_consulta = queryUrl;
    if (documentoConsulta) payload.documento_consulta = documentoConsulta;

    return payload;
  }

  async function saveProtocol(companyId, protocol, options = {}) {
    const isUpdate = options.isUpdate ?? Boolean(protocol.id);
    const baseUrl = scrapingApiBaseUrl() || undefined;
    const data = await request(isUpdate ? "protocol" : "protocolsByCompany", {
      method: isUpdate ? "PATCH" : "POST",
      params: { companyId, protocolId: protocol.id },
      body: backendProtocolPayload(companyId, protocol),
      baseUrl,
    });
    const saved = itemFromResponse(data, protocol);
    return { ...protocol, ...saved, id: saved?.id || protocol.id };
  }

  async function deleteProtocol(companyId, protocolId) {
    const baseUrl = scrapingApiBaseUrl() || undefined;
    await request("protocol", {
      method: "DELETE",
      params: { companyId, protocolId },
      baseUrl,
    });
  }

  async function runDashboard(companyId) {
    const runBaseUrl = scrapingApiBaseUrl() || undefined;
    const body = {};

    if (companyId) body.company_id = companyId;
    if (runBaseUrl) {
      const limit = Number(config.SCRAPING_RUN_LIMIT || 0);
      body.headless = true;
      body.background = config.SCRAPING_RUN_BACKGROUND !== false;
      if (Number.isFinite(limit) && limit > 0) body.limit = limit;
    }

    try {
      const data = await requestWithFallback("dashboardRun", ["dashboardRunApi"], {
        method: "POST",
        body: Object.keys(body).length ? body : undefined,
        baseUrl: runBaseUrl,
      });
      return { executed: true, items: listFromResponse(data) };
    } catch (error) {
      const normalized = String(error?.message || "").toLowerCase();
      if (
        normalized.includes("404") ||
        normalized.includes("405") ||
        normalized.includes("not found") ||
        normalized.includes("method not allowed")
      ) {
        return { executed: false, items: [] };
      }
      throw error;
    }
  }

  async function getDashboard() {
    const baseUrl = scrapingApiBaseUrl() || undefined;
    const data = await requestWithFallback("dashboard", [
      "dashboardApi",
      "dashboardLegacy",
      "dashboardLegacyV2",
      "protocolsByCompany",
    ], { baseUrl });
    return {
      raw: data,
      records: listFromResponse(data),
    };
  }

  async function getDashboardHistory(protocolId) {
    const baseUrl = scrapingApiBaseUrl() || undefined;
    const data = await requestWithFallback("dashboardHistory", ["dashboardHistoryApi"], {
      params: { protocolId },
      baseUrl,
    });
    const history = listFromResponse(data);
    const id = String(protocolId || "");
    if (!id) return history;

    return history.filter((entry) => {
      const entryProtocolId = entry?.protocolo_id || entry?.protocol_id || entry?.protocolId;
      return String(entryProtocolId || "") === id;
    });
  }

  window.bpkApi = {
    isEnabled,
    login,
    getProtocols,
    getProjects,
    getCompanies,
    saveProtocol,
    deleteProtocol,
    getDashboard,
    runDashboard,
    getDashboardHistory,
  };
})();

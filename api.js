(function () {
  const config = window.BPK_CONFIG || {};
  const tokenKey = config.AUTH_TOKEN_KEY || "bpk_auth_token";
  const authEnabled = config.AUTH_ENABLED !== false;

  function apiBaseUrl() {
    return String(config.API_BASE_URL || "").replace(/\/+$/, "");
  }

  function isEnabled() {
    const baseUrl = apiBaseUrl();
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
      response = await fetch(`${apiBaseUrl()}${endpoint(name, options.params)}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw new Error(
        "Falha de conexao com a API. Verifique se o backend esta online e se o CORS permite http://127.0.0.1:5500."
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof data === "object" ? data.message || data.error : data;
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
        const mayTryFallback = /\b404\b/i.test(message) || /\b405\b/i.test(message);
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
    if (data?.protocol) return data.protocol;
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
    const data = await request("protocolsByCompany", { params: { companyId } });
    return listFromResponse(data);
  }

  async function getProjects() {
    const data = await request("projects");
    return listFromResponse(data);
  }

  async function saveProtocol(companyId, protocol, options = {}) {
    const isUpdate = options.isUpdate ?? Boolean(protocol.id);
    const data = await request(isUpdate ? "protocol" : "protocolsByCompany", {
      method: isUpdate ? "PUT" : "POST",
      params: { companyId, protocolId: protocol.id },
      body: protocol,
    });
    return itemFromResponse(data, protocol);
  }

  async function deleteProtocol(companyId, protocolId) {
    await request("protocol", {
      method: "DELETE",
      params: { companyId, protocolId },
    });
  }

  async function runDashboard(companyId) {
    const body = companyId ? { company_id: companyId } : undefined;
    try {
      const data = await requestWithFallback("dashboardRun", ["dashboardRunApi"], {
        method: "POST",
        body,
      });
      return { executed: true, items: listFromResponse(data) };
    } catch (error) {
      const normalized = String(error?.message || "").toLowerCase();
      if (normalized.includes("404") || normalized.includes("405")) {
        return { executed: false, items: [] };
      }
      throw error;
    }
  }

  async function getDashboard() {
    const data = await requestWithFallback("dashboard", [
      "dashboardApi",
      "dashboardLegacy",
      "dashboardLegacyV2",
      "protocolsByCompany",
    ]);
    return {
      raw: data,
      records: listFromResponse(data),
    };
  }

  async function getDashboardHistory(protocolId) {
    const data = await requestWithFallback("dashboardHistory", ["dashboardHistoryApi"], {
      params: { protocolId },
    });
    return listFromResponse(data);
  }

  window.bpkApi = {
    isEnabled,
    login,
    getProtocols,
    getProjects,
    saveProtocol,
    deleteProtocol,
    getDashboard,
    runDashboard,
    getDashboardHistory,
  };
})();

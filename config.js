window.BPK_CONFIG = {
  API_BASE_URL: "https://hackatonbpk-1.onrender.com",
  SCRAPING_API_BASE_URL: "http://127.0.0.1:8000",
  SCRAPING_RUN_BACKGROUND: true,
  SCRAPING_RUN_LIMIT: 6,

  AUTH_ENABLED: false,
  READ_ONLY_API: false,
  AUTH_TOKEN_KEY: "bpk_auth_token",

  ENDPOINTS: {
    login:              "/api/login",
    protocolsByCompany: "/api/protocolos",
    projects:           "/api/projetos",
    protocol:           "/api/protocolos/{protocolId}",
    companies:          "/api/empresas",
    history:            "/api/historico",
    dashboard:          "/api/protocolos",
    dashboardApi:       "/api/dashboard",
    dashboardLegacy:    "/api/protocolos",
    dashboardLegacyV2:  "/protocolos",
    dashboardRun:       "/api/consultas/executar",
    dashboardRunApi:    "/consultas/executar",
    dashboardHistory:   "/api/historico",
    dashboardHistoryApi:"/api/consultas/{protocolId}/historico",
  },

  CONSULTA_URLS: {
    prefeitura_toledo: "",
  },
};

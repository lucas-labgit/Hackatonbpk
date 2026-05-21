window.BPK_CONFIG = {
  API_BASE_URL: "https://hackatonbpk-1.onrender.com",

  AUTH_ENABLED: true,
  READ_ONLY_API: true,
  AUTH_TOKEN_KEY: "bpk_auth_token",

  ENDPOINTS: {
    login:              "/api/login",
    protocolsByCompany: "/api/protocolos",
    projects:           "/api/projetos",
    protocol:           "/api/protocolos/{protocolId}",
    dashboard:          "/dashboard",
    dashboardApi:       "/api/dashboard",
    dashboardLegacy:    "/api/protocolos",
    dashboardLegacyV2:  "/protocolos",
    dashboardRun:       "/consultas/executar",
    dashboardRunApi:    "/api/consultas/executar",
    dashboardHistory:   "/consultas/{protocolId}/historico",
    dashboardHistoryApi:"/api/consultas/{protocolId}/historico",
  },
};

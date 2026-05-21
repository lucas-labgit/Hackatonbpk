const PROTOCOL_STORAGE_PREFIX = "bpk_protocols_company_";
const SESSION_KEY = "bpk_active_company";
const api = window.bpkApi;
const config = window.BPK_CONFIG || {};
const COMPANY_LIST = [
  {
    id: "emp01",
    name: "Prefeitura de Toledo",
    filterLabel: ["Prefeitura", "de", "Toledo"],
    iconImage: "imagens/icones/PREFEITURA_TOLEDO.png",
    image: "imagens/filtro/PREFEITURA_TOLEDO.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp02",
    name: "Cartorio Reg. Imoveis",
    filterLabel: ["Cartório", "Reg.", "Imóveis"],
    iconImage: "imagens/icones/IMOVEIS.png",
    image: "imagens/filtro/IMOVEIS.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp03",
    name: "IAT",
    iconImage: "imagens/icones/IAC.png",
    image: "imagens/filtro/IAC.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp04",
    name: "ANAC",
    iconImage: "imagens/icones/ANAC.png",
    image: "imagens/filtro/ANAC.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp05",
    name: "Sanepar",
    iconImage: "imagens/icones/SANEPAR.png",
    image: "imagens/filtro/SANEPAR.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp06",
    name: "Copel",
    iconImage: "imagens/icones/COPEL.png",
    image: "imagens/filtro/COPEL.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp07",
    name: "SAIP",
    iconImage: "imagens/icones/SAIP.png",
    image: "imagens/filtro/SAIP.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp08",
    name: "Corpo de Bombeiros",
    filterLabel: ["Corpo", "de", "Bombeiros"],
    iconImage: "imagens/icones/BOMBEIROS.png",
    image: "imagens/filtro/BOMBEIROS.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
  {
    id: "emp09",
    name: "Prefeitura de Cascavel",
    filterLabel: ["Prefeitura", "de", "Cascavel"],
    iconImage: "imagens/icones/CASCAVEL.png",
    image: "imagens/filtro/CASCAVEL.png",
    powerBiUrl: "https://app.powerbi.com/",
  },
];

const organs = COMPANY_LIST.map((company) => company.name);
const COMPANY_ORGAN_ALIASES = {
  emp01: ["Prefeitura Toledo", "Prefeitura de Toledo"],
  emp02: ["Cartorio Reg. Imoveis", "Cartório Reg. Imóveis", "Cartório"],
  emp03: ["IAT", "IAC", "IPHAN"],
  emp04: ["ANAC"],
  emp05: ["Sanepar", "SANEPAR"],
  emp06: ["Copel", "COPEL"],
  emp07: ["SAIP"],
  emp08: ["Corpo de Bombeiros"],
  emp09: ["Prefeitura de Cascavel", "Cascavel"],
};
const DASHBOARD_ORGAN_FILTERS = [
  {
    label: "Prefeitura de Toledo",
    aliases: ["Prefeitura de Toledo", "Prefeitura Toledo"],
  },
  {
    label: "Cartorio Reg. Imoveis",
    aliases: ["Cartorio Reg. Imoveis", "Cartório Reg. Imóveis", "Cartório"],
  },
  {
    label: "IAT",
    aliases: ["IAT", "IAC", "IPHAN"],
  },
  {
    label: "ANAC",
    aliases: ["ANAC"],
  },
  {
    label: "Sanepar",
    aliases: ["Sanepar", "SANEPAR"],
  },
  {
    label: "Copel",
    aliases: ["Copel", "COPEL"],
  },
  {
    label: "SAIP",
    aliases: ["SAIP"],
  },
  {
    label: "Corpo de Bombeiros",
    aliases: ["Corpo de Bombeiros", "Bombeiros"],
  },
  {
    label: "Prefeitura de Cascavel",
    aliases: ["Prefeitura de Cascavel", "Cascavel"],
  },
];

const state = {
  company: null,
  user: null,
  protocols: [],
  projects: [],
  companies: [],
  selectedId: null,
  companyQuery: "",
  query: "",
  status: "todos",
};

const dashboardData = {
  records: [],
  projects: [],
  loaded: false,
  lastUpdatedAt: "",
  historyByProtocol: {},
};

const dashboardUiState = {
  project: "todos",
  organ: "todos",
  status: "todos",
  situation: "todos",
  period: "todos",
  onlyChanged: false,
  onlyError: false,
  lastRunAt: null,
};

const els = {
  companyFilterList: document.querySelector("#companyFilterList"),
  companySearchInput: document.querySelector("#companySearchInput"),
  currentCompanyName: document.querySelector("#currentCompanyName"),
  companyScopeLabel: document.querySelector("#companyScopeLabel"),
  powerBiButton: document.querySelector("#powerBiButton"),
  powerBiDialog: document.querySelector("#powerBiDialog"),
  powerBiTitle: document.querySelector("#powerBiTitle"),
  dashboardCompanySubtitle: document.querySelector("#dashboardCompanySubtitle"),
  dashboardLastMeta: document.querySelector("#dashboardLastMeta"),
  closePowerBiButton: document.querySelector("#closePowerBiButton"),
  dashboardRunButton: document.querySelector("#dashboardRunButton"),
  dashboardImportButton: document.querySelector("#dashboardImportButton"),
  dashboardImportInput: document.querySelector("#dashboardImportInput"),
  dashboardPdfButton: document.querySelector("#dashboardPdfButton"),
  dashboardExportButton: document.querySelector("#dashboardExportButton"),
  dashboardNewProtocolButton: document.querySelector("#dashboardNewProtocolButton"),
  dashboardCloseButton: document.querySelector("#dashboardCloseButton"),
  dashTotal: document.querySelector("#dashTotal"),
  dashActive: document.querySelector("#dashActive"),
  dashFinished: document.querySelector("#dashFinished"),
  dashChanged: document.querySelector("#dashChanged"),
  dashError: document.querySelector("#dashError"),
  dashStale: document.querySelector("#dashStale"),
  dashLastUpdate: document.querySelector("#dashLastUpdate"),
  dashFilterProject: document.querySelector("#dashFilterProject"),
  dashFilterOrgan: document.querySelector("#dashFilterOrgan"),
  dashFilterStatus: document.querySelector("#dashFilterStatus"),
  dashFilterSituation: document.querySelector("#dashFilterSituation"),
  dashFilterPeriod: document.querySelector("#dashFilterPeriod"),
  dashOnlyChanged: document.querySelector("#dashOnlyChanged"),
  dashOnlyError: document.querySelector("#dashOnlyError"),
  dashChartStatus: document.querySelector("#dashChartStatus"),
  dashChartProject: document.querySelector("#dashChartProject"),
  dashChartOrgan: document.querySelector("#dashChartOrgan"),
  dashTableBody: document.querySelector("#dashTableBody"),
  dashChangesList: document.querySelector("#dashChangesList"),
  dashErrorsList: document.querySelector("#dashErrorsList"),
  dashStaleList: document.querySelector("#dashStaleList"),
  dashResetFiltersButton: document.querySelector("#dashResetFiltersButton"),
  dashboardHistoryDialog: document.querySelector("#dashboardHistoryDialog"),
  dashboardHistoryTitle: document.querySelector("#dashboardHistoryTitle"),
  dashboardHistoryMeta: document.querySelector("#dashboardHistoryMeta"),
  dashboardHistoryBody: document.querySelector("#dashboardHistoryBody"),
  closeDashboardHistoryButton: document.querySelector("#closeDashboardHistoryButton"),
  companyShortcutButton: document.querySelector("#companyShortcutButton"),
  refreshProtocolsButton: document.querySelector("#refreshProtocolsButton"),
  table: document.querySelector("#protocolTable"),
  totalProtocols: document.querySelector("#totalProtocols"),
  openProtocols: document.querySelector("#openProtocols"),
  highPriority: document.querySelector("#highPriority"),
  totalOrgans: document.querySelector("#totalOrgans"),
  resultCount: document.querySelector("#resultCount"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  detailsContent: document.querySelector("#detailsContent"),
  selectedProtocolNumber: document.querySelector("#selectedProtocolNumber"),
  dialog: document.querySelector("#protocolDialog"),
  form: document.querySelector("#protocolForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  newProtocolButton: document.querySelector("#newProtocolButton"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelButton: document.querySelector("#cancelButton"),
  protocolId: document.querySelector("#protocolId"),
  numberInput: document.querySelector("#numberInput"),
  openedAtInput: document.querySelector("#openedAtInput"),
  personInput: document.querySelector("#personInput"),
  documentInput: document.querySelector("#documentInput"),
  organInput: document.querySelector("#organInput"),
  projectInput: document.querySelector("#projectInput"),
  departmentInput: document.querySelector("#departmentInput"),
  statusInput: document.querySelector("#statusInput"),
  priorityInput: document.querySelector("#priorityInput"),
  queryTypeInput: document.querySelector("#queryTypeInput"),
  queryUrlInput: document.querySelector("#queryUrlInput"),
  subjectInput: document.querySelector("#subjectInput"),
  notesInput: document.querySelector("#notesInput"),
  screenButtons: document.querySelectorAll("[data-screen-target]"),
  screens: document.querySelectorAll("[data-screen]"),
};

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `protocol-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function protocolsStorageKey(companyId) {
  return `${PROTOCOL_STORAGE_PREFIX}${companyId}`;
}

function findCompany(companyId) {
  return COMPANY_LIST.find((company) => company.id === companyId);
}

function findCompanyByName(companyName) {
  return COMPANY_LIST.find((company) => company.name === companyName);
}

function writeStoredProtocols(companyId, protocols) {
  localStorage.setItem(protocolsStorageKey(companyId), JSON.stringify(protocols));
}

function shouldUseApi() {
  return Boolean(api?.isEnabled?.());
}

function isApiReadOnly() {
  return Boolean(config.READ_ONLY_API);
}

function reportApiError(action, error) {
  console.error(`Erro ao ${action}:`, error);
  if (els.companyScopeLabel) {
    els.companyScopeLabel.textContent = "Backend indisponivel no momento";
  }
}

function friendlyApiErrorMessage(error, fallbackText) {
  const raw = String(error?.message || "").trim();
  if (!raw) return fallbackText;

  const normalized = raw.toLowerCase();
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("falha de conexao")
  ) {
    return "Nao foi possivel conectar ao backend. Confira API_BASE_URL, se a API esta online e se o CORS libera http://127.0.0.1:5500.";
  }

  return raw;
}

function findCompanyByBackendOrgan(organ) {
  const normalizedOrgan = normalize(organ);
  return COMPANY_LIST.find((company) =>
    (COMPANY_ORGAN_ALIASES[company.id] || [company.name]).some((alias) => normalize(alias) === normalizedOrgan)
  );
}

function queryTypeForOrgan(organ) {
  const company = findCompanyByName(organ) || findCompanyByBackendOrgan(organ);
  if (company?.id === "emp01") return "prefeitura_toledo";
  return "";
}

function defaultQueryUrlForType(queryType) {
  return String(config.CONSULTA_URLS?.[queryType] || "").trim();
}

function applyQueryDefaultsForOrgan(force = false) {
  if (!els.queryTypeInput) return;
  const queryType = queryTypeForOrgan(els.organInput?.value);
  if (force || !els.queryTypeInput.value) {
    els.queryTypeInput.value = queryType;
  }
  if (force && !els.queryTypeInput.value && els.queryUrlInput) {
    els.queryUrlInput.value = "";
    return;
  }
  if (els.queryUrlInput && !els.queryUrlInput.value) {
    els.queryUrlInput.value = defaultQueryUrlForType(els.queryTypeInput.value);
  }
}

function dashboardOrganMatches(record, selectedOrgan) {
  if (selectedOrgan === "todos") return true;
  const filter = DASHBOARD_ORGAN_FILTERS.find((item) => item.label === selectedOrgan);
  const aliases = filter?.aliases || [selectedOrgan];
  const recordValues = [record.organ, record.companyName].map(normalize);
  return aliases.some((alias) => recordValues.includes(normalize(alias)));
}

function normalizeBackendStatus(status) {
  const normalizedStatus = normalize(status);
  if (normalizedStatus.includes("concl") || normalizedStatus.includes("apro")) return "Concluido";
  if (normalizedStatus.includes("canc")) return "Arquivado";
  if (normalizedStatus.includes("pend") || normalizedStatus.includes("aguard")) return "Pendente";
  return "Em andamento";
}

function inferProjectName(record, projects = []) {
  const directProject =
    record.projeto_nome ||
    record.projeto ||
    record.nome_projeto ||
    record.empreendimento ||
    record.project;
  if (directProject) return directProject;

  const projectId =
    record.projeto_id ||
    record.project_id ||
    record.empreendimento_id ||
    record.id_projeto ||
    record.projectId;
  if (projectId) {
    const linkedProject = projects.find((project) => String(project.id) === String(projectId));
    if (linkedProject?.nome || linkedProject?.name) return linkedProject.nome || linkedProject.name;
  }

  const searchable = normalize(
    [
      record.numero_protocolo,
      record.number,
      record.atividade,
      record.subject,
      record.situacao,
      record.observacao,
      record.notes,
    ].join(" ")
  );
  const mentionedProject = [...projects]
    .filter((project) => project?.nome || project?.name)
    .sort((a, b) => String(b.nome || b.name).length - String(a.nome || a.name).length)
    .find((project) => {
      const projectName = normalize(project.nome || project.name);
      return projectName.length > 2 && searchable.includes(projectName);
    });

  return mentionedProject?.nome || mentionedProject?.name || "-";
}

function findProjectById(projectId) {
  return state.projects.find((project) => String(project.id) === String(projectId));
}

function projectName(project) {
  return project?.nome || project?.name || "Projeto";
}

function fallbackProjectForProtocol(protocol) {
  if (protocol?.projectId) return findProjectById(protocol.projectId);
  if (protocol?.projeto_id) return findProjectById(protocol.projeto_id);
  if (protocol?.project && protocol.project !== "-") {
    const normalizedProject = normalize(protocol.project);
    return state.projects.find((project) => normalize(projectName(project)) === normalizedProject);
  }
  return state.projects[0] || null;
}

function backendCompanyIdForProject(project) {
  return project?.empresa_id || project?.company_id || state.companies[0]?.id || "";
}

function canonicalDashboardOrganName(rawOrgan) {
  const company = findCompanyByBackendOrgan(rawOrgan);
  if (company?.name) return company.name;
  const value = String(rawOrgan || "").trim();
  return value || "-";
}

function canonicalDashboardStatus(rawStatus) {
  const normalizedStatus = normalize(rawStatus);
  if (!normalizedStatus) return "Nao informado";
  if (normalizedStatus.includes("encaminh")) return "Encaminhado";
  if (normalizedStatus.includes("anal")) return "Em analise";
  if (normalizedStatus.includes("aguard") || normalizedStatus.includes("pend")) return "Aguardando";
  if (normalizedStatus.includes("apro")) return "Aprovado";
  if (normalizedStatus.includes("canc")) return "Cancelado";
  if (normalizedStatus.includes("retir")) return "Retirado";
  if (normalizedStatus.includes("concl") || normalizedStatus.includes("finaliz") || normalizedStatus.includes("arquiv")) return "Finalizado";
  if (normalizedStatus.includes("abert")) return "Protocolo aberto";
  return String(rawStatus || "").trim() || "Nao informado";
}

function mapBackendProtocol(record, projects = []) {
  const company = findCompanyByBackendOrgan(record.orgao);
  const updatedAt =
    record.updated_at ||
    record.ultima_consulta ||
    record.data_consulta ||
    record.data_movimentacao ||
    new Date().toISOString();
  const project = inferProjectName(record, projects);

  return {
    id: record.id || createId(),
    number: record.numero_protocolo || record.number || "-",
    openedAt: String(record.data_abertura || record.data_movimentacao || record.created_at || updatedAt).slice(0, 10),
    person: record.responsavel || record.person || "-",
    document:
      record.documento_consulta ||
      record.documento ||
      record.cpf_cnpj ||
      record.cnpj ||
      record.cpf ||
      record.document ||
      "",
    projectId: record.projeto_id || record.project_id || "",
    companyId: record.empresa_id || record.company_id || "",
    companyName: company?.name || record.orgao || "-",
    project,
    organ: record.orgao || company?.name || "-",
    department: record.orgao || "-",
    status: normalizeBackendStatus(record.status_atual || record.status),
    priority: "Media",
    subject: record.atividade || record.subject || "-",
    notes: record.observacao_consulta || record.situacao || record.anotacoes || record.notes || "",
    queryType: record.tipo_consulta || record.queryType || "",
    queryUrl: record.link_consulta || record.queryUrl || "",
    updatedAt,
  };
}

function firstNonEmpty(record, keys, fallback = "") {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
}

function parseBooleanish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = normalize(value);
  if (["sim", "true", "1", "yes"].includes(normalized)) return true;
  if (["nao", "false", "0", "no", ""].includes(normalized)) return false;
  return fallback;
}

function normalizeIsoDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function calculateDurationLabelFromDates(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";

  const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}min` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (!remHours && !minutes) return `${days}d`;
  if (!minutes) return `${days}d ${remHours}h`;
  return `${days}d ${remHours}h ${minutes}min`;
}

function dashboardDurationLabelFromApi(record, openedAt, consultedAt) {
  const rawLabel = firstNonEmpty(
    record,
    [
      "duracao_formatada",
      "duracao_texto",
      "duracao_label",
      "duracao_calculada",
      "duration_label",
      "duration_text",
    ],
    ""
  );
  if (rawLabel) return String(rawLabel);

  const minutesValue = Number(
    firstNonEmpty(record, ["duracao_minutos", "duration_minutes", "tempo_minutos"], Number.NaN)
  );
  if (Number.isFinite(minutesValue)) {
    return calculateDurationLabelFromDates(
      new Date(new Date(consultedAt).getTime() - minutesValue * 60000).toISOString(),
      consultedAt
    );
  }

  if (openedAt && consultedAt) {
    return calculateDurationLabelFromDates(openedAt, consultedAt);
  }
  return "-";
}

function mapDashboardHistoryEntry(entry, fallbackRecord) {
  const consultedAt = normalizeIsoDateTime(
    firstNonEmpty(entry, ["data_hora_consulta", "data_consulta", "consulted_at", "updated_at"], fallbackRecord.consultedAt)
  );
  const statusCurrent = firstNonEmpty(
    entry,
    ["status_atual", "status", "novo_status", "status_novo"],
    fallbackRecord.statusCurrent
  );
  const statusPrevious = firstNonEmpty(
    entry,
    ["status_anterior", "status_previo", "status_antigo"],
    fallbackRecord.statusPrevious
  );
  const changed = parseBooleanish(
    firstNonEmpty(entry, ["mudou", "houve_mudanca", "change", "alterado"], ""),
    statusPrevious && statusCurrent && normalize(statusPrevious) !== normalize(statusCurrent)
  );
  const errorMessage = firstNonEmpty(
    entry,
    ["erro_consulta", "erro", "query_error", "mensagem_erro", "error_message"],
    ""
  );
  const erro = parseBooleanish(firstNonEmpty(entry, ["erro", "com_erro", "has_error"], ""), Boolean(errorMessage));
  const observation = firstNonEmpty(entry, ["observacao", "observacao_consulta", "obs", "comentario"], fallbackRecord.observation);
  const durationLabel = dashboardDurationLabelFromApi(entry, fallbackRecord.openedAt, consultedAt);

  return {
    consultedAt,
    statusCurrent,
    statusPrevious,
    changed,
    erro,
    errorMessage,
    observation,
    durationLabel,
  };
}

function mapDashboardRecord(record, projects = []) {
  const project = inferProjectName(record, projects);
  const organ = canonicalDashboardOrganName(firstNonEmpty(record, ["orgao", "orgao_site", "site", "empresa", "company_name"], "-"));
  const number = firstNonEmpty(record, ["numero_protocolo", "protocolo", "protocol_number", "number"], "-");
  const statusCurrent = canonicalDashboardStatus(
    firstNonEmpty(record, ["status_atual", "status", "statusAtual", "current_status"], "")
  );
  const statusPrevious = firstNonEmpty(record, ["status_anterior", "previous_status", "statusAnterior"], "-");
  const consultedAt = normalizeIsoDateTime(
    firstNonEmpty(record, ["data_hora_consulta", "data_consulta", "ultima_consulta", "consulted_at", "updated_at"], "")
  );
  const openedAt = normalizeIsoDateTime(
    firstNonEmpty(record, ["data_abertura", "opened_at", "created_at", "data_movimentacao"], "")
  );
  const observation = firstNonEmpty(record, ["observacao", "observacao_consulta", "atividade", "situacao", "notes"], "-");
  const errorMessage = firstNonEmpty(
    record,
    ["erro_consulta", "mensagem_erro", "query_error", "error_message", "erro"],
    ""
  );
  const error = parseBooleanish(firstNonEmpty(record, ["erro", "com_erro", "has_error"], ""), Boolean(errorMessage));
  const noUpdate = parseBooleanish(firstNonEmpty(record, ["sem_atualizacao", "no_update", "stale"], ""), false);
  const changed = parseBooleanish(
    firstNonEmpty(record, ["mudou", "houve_mudanca", "change", "alterado"], ""),
    statusPrevious !== "-" && normalize(statusPrevious) !== normalize(statusCurrent)
  );
  const situationRaw = firstNonEmpty(record, ["situacao", "situacao_atual", "situation"], "");

  const mapped = {
    id: firstNonEmpty(record, ["id", "protocolo_id", "protocol_id"], `${number}-${organ}`),
    historyRef: firstNonEmpty(record, ["id", "protocolo_id", "protocol_id", "numero_protocolo"], number),
    project,
    organ,
    number,
    statusCurrent,
    statusPrevious,
    situationRaw,
    observation,
    consultedAt,
    openedAt,
    durationLabel: dashboardDurationLabelFromApi(record, openedAt, consultedAt),
    changed,
    error,
    queryError: errorMessage,
    noUpdate: !error && noUpdate,
    history: [],
  };

  const rawHistory = Array.isArray(record.historico)
    ? record.historico
    : Array.isArray(record.consultas_anteriores)
      ? record.consultas_anteriores
      : Array.isArray(record.history)
        ? record.history
        : [];
  mapped.history = rawHistory.map((entry) => mapDashboardHistoryEntry(entry, mapped));
  return mapped;
}

async function loadDashboardData() {
  if (!shouldUseApi()) {
    dashboardData.projects = [];
    dashboardData.records = [];
    dashboardData.historyByProtocol = {};
    dashboardData.loaded = true;
    dashboardData.lastUpdatedAt = "";
    return dashboardData.records;
  }

  try {
    const projectsRequest = typeof api.getProjects === "function" ? api.getProjects().catch(() => []) : Promise.resolve([]);
    const companiesRequest = typeof api.getCompanies === "function" ? api.getCompanies().catch(() => []) : Promise.resolve([]);
    const [dashboardResponse, backendProjects, backendCompanies] = await Promise.all([
      api.getDashboard(),
      projectsRequest,
      companiesRequest,
    ]);
    state.projects = backendProjects;
    state.companies = backendCompanies;
    const allowedOrgans = new Set(COMPANY_LIST.map((company) => normalize(company.name)));
    const mappedRecords = dashboardResponse.records
      .map((record) => mapDashboardRecord(record, backendProjects))
      .filter((record) => allowedOrgans.has(normalize(record.organ)));
    const updatedAtFromPayload = normalizeIsoDateTime(
      firstNonEmpty(
        dashboardResponse.raw,
        ["ultima_atualizacao_geral", "ultima_atualizacao", "data_hora_execucao", "updated_at"],
        ""
      )
    );

    dashboardData.records = mappedRecords;
    dashboardData.historyByProtocol = {};
    dashboardData.projects = [
      ...new Set([
        ...backendProjects.map((project) => project.nome || project.name).filter(Boolean),
        ...mappedRecords.map((record) => record.project).filter((project) => project && project !== "-"),
      ]),
    ].sort();
    dashboardData.loaded = true;
    dashboardData.lastUpdatedAt =
      updatedAtFromPayload ||
      mappedRecords
        .map((record) => record.consultedAt)
        .filter(Boolean)
        .sort()
        .slice(-1)[0] ||
      "";

    return dashboardData.records;
  } catch (error) {
    reportApiError("carregar dados do dashboard", error);
    dashboardData.projects = [];
    dashboardData.records = [];
    dashboardData.historyByProtocol = {};
    dashboardData.loaded = true;
    dashboardData.lastUpdatedAt = "";
    return dashboardData.records;
  }
}

async function loadProtocolsByCompany(companyId) {
  const company = findCompany(companyId);

  // Atualiza status para indicar que esta buscando dados reais
  if (els.companyScopeLabel) {
    els.companyScopeLabel.textContent = "Buscando protocolos do servidor...";
  }

  if (shouldUseApi()) {
    try {
      const projectsRequest = typeof api.getProjects === "function" ? api.getProjects().catch(() => []) : Promise.resolve([]);
      const companiesRequest = typeof api.getCompanies === "function" ? api.getCompanies().catch(() => []) : Promise.resolve([]);
      const [backendProtocols, backendProjects, backendCompanies] = await Promise.all([
        api.getProtocols(companyId),
        projectsRequest,
        companiesRequest,
      ]);
      state.projects = backendProjects;
      state.companies = backendCompanies;
      const protocols = backendProtocols.map((protocol) => mapBackendProtocol(protocol, backendProjects));
      // Filtra por empresa ativa; se o backend retornar todos, filtra aqui
      const companyProtocols = protocols.filter(
        (protocol) =>
          protocol.companyName === company?.name ||
          (COMPANY_ORGAN_ALIASES[companyId] || []).some(
            (alias) => normalize(alias) === normalize(protocol.organ)
          )
      );
      if (els.companyScopeLabel) {
        els.companyScopeLabel.textContent = `${companyProtocols.length} protocolo(s) carregado(s) do servidor`;
      }
      return companyProtocols;
    } catch (error) {
      reportApiError("carregar protocolos", error);
      if (els.companyScopeLabel) {
        els.companyScopeLabel.textContent = "Servidor indisponivel — nenhum protocolo carregado";
      }
      return [];
    }
  }
  if (els.companyScopeLabel) {
    els.companyScopeLabel.textContent = "API nao configurada — nenhum protocolo carregado";
  }
  return [];
}

function normalizeProtocolsForCompany(protocols, company) {
  let changed = false;
  const companyName = company?.name || organs[0];

  const normalizedProtocols = protocols.map((protocol) => {
    if (protocol.organ === companyName) {
      return protocol;
    }

    changed = true;
    return {
      ...protocol,
      organ: companyName,
    };
  });

  return { protocols: normalizedProtocols, changed };
}

function saveProtocolsByCompany(companyId, protocols = state.protocols) {
  writeStoredProtocols(companyId, protocols);
}

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function statusClass(status) {
  return `status-${normalize(status).replace(/\s+/g, "-")}`;
}

function priorityClass(priority) {
  return `priority-${normalize(priority)}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(",", "");
}

function dateDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function dateOnlyDaysAgo(days) {
  return dateDaysAgo(days).slice(0, 10);
}

function dashboardStatusInfo(status) {
  const normalized = normalize(canonicalDashboardStatus(status));
  if (normalized.includes("erro")) return { color: "#ef4444" };
  if (normalized.includes("finaliz")) return { color: "#22c55e" };
  if (normalized.includes("aguard")) return { color: "#f59e0b" };
  if (normalized.includes("cancel") || normalized.includes("retir")) return { color: "#94a3b8" };
  if (normalized.includes("apro")) return { color: "#2563eb" };
  return { color: "#2563eb" };
}

function dashboardSituation(record) {
  if (record.error) return "Erro consulta";
  if (record.noUpdate) return "Sem atualizacao";
  const rawSituation = normalize(record.situationRaw);
  if (rawSituation.includes("encaminh")) return "Encaminhado";
  if (rawSituation.includes("analis")) return "Em analise";
  if (rawSituation.includes("aguard")) return "Aguardando";
  if (rawSituation.includes("apro")) return "Aprovado";
  if (rawSituation.includes("cancel")) return "Cancelado";
  if (rawSituation.includes("retir")) return "Retirado";
  if (rawSituation.includes("concl") || rawSituation.includes("finaliz")) return "Finalizado";
  if (rawSituation.includes("aberto")) return "Protocolo aberto";
  const statusSituation = canonicalDashboardStatus(record.statusCurrent);
  if (statusSituation !== "Nao informado") return statusSituation;
  if (record.changed) return "Alterado";
  return "Nao informado";
}

function dashboardDuration(record) {
  if (record.durationLabel && record.durationLabel !== "-") return record.durationLabel;
  if (record.openedAt && record.consultedAt) {
    return calculateDurationLabelFromDates(record.openedAt, record.consultedAt);
  }
  return "-";
}

function buildDashboardRecords() {
  return dashboardData.records
    .map((record, index) => ({
      ...record,
      id: record.id || `${record.number || "sem-numero"}-${index}`,
      historyRef: record.historyRef || record.id || record.number,
      project: record.project && record.project !== "-" ? record.project : "Sem projeto vinculado",
      organ: record.organ || "-",
      number: record.number || "-",
      statusCurrent: record.statusCurrent || "Sem status",
      statusPrevious: record.statusPrevious || "-",
      situationRaw: record.situationRaw || "",
      observation: record.observation || "-",
      consultedAt: record.consultedAt || "",
      openedAt: record.openedAt || "",
      changed: Boolean(record.changed),
      error: Boolean(record.error),
      queryError: record.queryError || "",
      noUpdate: Boolean(record.noUpdate),
      durationLabel: record.durationLabel || "-",
      history: Array.isArray(record.history) ? record.history : [],
    }))
    .sort((a, b) => new Date(b.consultedAt || 0) - new Date(a.consultedAt || 0));
}

function dashboardBooleanLabel(value) {
  return value ? "Sim" : "Nao";
}

function populateDashboardSelect(select, values, allLabel = "Todos") {
  if (!select) return;
  const current = select.value || "todos";
  select.innerHTML = `<option value="todos">${allLabel}</option>${values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
  select.value = values.includes(current) ? current : "todos";
}

function setDashboardSelectSingleOption(select, label) {
  if (!select) return;
  select.innerHTML = `<option value="todos">${escapeHtml(label)}</option>`;
  select.value = "todos";
}

function syncDashboardFilterState() {
  dashboardUiState.project = els.dashFilterProject?.value || "todos";
  dashboardUiState.organ = els.dashFilterOrgan?.value || "todos";
  dashboardUiState.status = els.dashFilterStatus?.value || "todos";
  dashboardUiState.situation = els.dashFilterSituation?.value || "todos";
  dashboardUiState.period = els.dashFilterPeriod?.value || "todos";
  dashboardUiState.onlyChanged = Boolean(els.dashOnlyChanged?.checked);
  dashboardUiState.onlyError = Boolean(els.dashOnlyError?.checked);
}

function filteredDashboardRecords() {
  const records = buildDashboardRecords();
  const now = Date.now();

  return records.filter((record) => {
    const situation = dashboardSituation(record);
    if (dashboardUiState.project !== "todos" && record.project !== dashboardUiState.project) return false;
    if (dashboardUiState.organ !== "todos" && normalize(record.organ) !== normalize(dashboardUiState.organ)) return false;
    if (dashboardUiState.status !== "todos" && record.statusCurrent !== dashboardUiState.status) return false;
    if (dashboardUiState.situation !== "todos" && situation !== dashboardUiState.situation) return false;
    if (dashboardUiState.onlyChanged && !record.changed) return false;
    if (dashboardUiState.onlyError && !record.error) return false;
    if (dashboardUiState.period !== "todos") {
      const days = Number(dashboardUiState.period);
      const referenceDate = record.consultedAt || record.openedAt;
      if (!referenceDate) return false;
      const updated = new Date(referenceDate).getTime();
      if (Number.isNaN(updated) || (now - updated) / 86400000 > days) return false;
    }
    return true;
  });
}

function countDashboardBy(records, getKey) {
  return records.reduce((map, record) => {
    const key = getKey(record) || "Nao informado";
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
}

function renderDashboardBars(container, entries, total, colorResolver = () => "#2563eb") {
  if (!container) return;
  if (!entries.length) {
    container.innerHTML = `<p class="dashboard-empty">Sem dados para exibir.</p>`;
    return;
  }

  container.innerHTML = entries
    .map(([label, value]) => {
      const width = Math.max(4, Math.min(100, total ? (value / total) * 100 : 0));
      return `
        <div class="dashboard-bar-row">
          <div class="dashboard-bar-top"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>
          <div class="dashboard-bar-track"><span style="width:${width.toFixed(1)}%;background:${colorResolver(label)}"></span></div>
        </div>
      `;
    })
    .join("");
}

function dashboardBadgeClass(value) {
  const normalized = normalize(value);
  if (normalized.includes("erro")) return "dash-badge-red";
  if (normalized.includes("sem atualizacao") || normalized.includes("pendente")) return "dash-badge-amber";
  if (normalized.includes("concluido") || normalized.includes("finalizado")) return "dash-badge-green";
  if (normalized.includes("arquivado")) return "dash-badge-gray";
  return "dash-badge-blue";
}

function renderDashboard() {
  if (!els.powerBiDialog) return;
  const allRecords = buildDashboardRecords();
  const projects = [...new Set(allRecords.map((record) => record.project).filter((value) => value && value !== "-"))].sort();
  const organsList = [...new Set(COMPANY_LIST.map((company) => company.name))].sort();
  const statusOrder = ["Em analise", "Aguardando", "Encaminhado", "Aprovado", "Cancelado", "Retirado", "Finalizado", "Protocolo aberto"];
  const statusesPresent = new Set(allRecords.map((record) => canonicalDashboardStatus(record.statusCurrent)));
  const statuses = statusOrder.filter((status) => statusesPresent.has(status));
  const situationOrder = ["Em analise", "Aguardando", "Encaminhado", "Aprovado", "Cancelado", "Retirado", "Finalizado", "Protocolo aberto", "Erro consulta", "Sem atualizacao", "Alterado"];
  const situationsPresent = new Set(allRecords.map((record) => dashboardSituation(record)));
  const situations = situationOrder.filter((situation) => situationsPresent.has(situation));

  populateDashboardSelect(els.dashFilterProject, projects);
  populateDashboardSelect(els.dashFilterOrgan, organsList);
  populateDashboardSelect(els.dashFilterStatus, statuses);
  populateDashboardSelect(els.dashFilterSituation, situations);
  if (els.dashFilterProject) els.dashFilterProject.disabled = false;
  if (els.dashFilterPeriod) els.dashFilterPeriod.disabled = false;
  syncDashboardFilterState();

  const records = filteredDashboardRecords();
  const total = records.length;
  const active = records.filter((record) => {
    const normalizedStatus = normalize(record.statusCurrent);
    return normalizedStatus.includes("analise") || normalizedStatus.includes("aguard") || normalizedStatus.includes("encaminh") || normalizedStatus.includes("apro");
  }).length;
  const finished = records.filter((record) => dashboardSituation(record) === "Finalizado").length;
  const changed = records.filter((record) => record.changed).length;
  const errors = records.filter((record) => record.error).length;
  const stale = records.filter((record) => record.noUpdate).length;

  if (els.powerBiTitle) els.powerBiTitle.textContent = `Dashboard de Protocolos`;
  if (els.dashboardCompanySubtitle) {
    els.dashboardCompanySubtitle.textContent = "Dados da FastAPI";
  }
  if (els.dashboardLastMeta) {
    const lastRun = dashboardData.lastUpdatedAt || dashboardUiState.lastRunAt?.toISOString() || "";
    els.dashboardLastMeta.textContent = `Ultima consulta: ${formatDateTime(lastRun)} - ${total} protocolos - ${errors} com erro`;
  }

  if (els.dashTotal) els.dashTotal.textContent = total;
  if (els.dashActive) els.dashActive.textContent = active;
  if (els.dashFinished) els.dashFinished.textContent = finished;
  if (els.dashChanged) els.dashChanged.textContent = changed;
  if (els.dashError) els.dashError.textContent = errors;
  if (els.dashStale) els.dashStale.textContent = `${stale} sem atualizacao`;
  if (els.dashLastUpdate) {
    const lastLabel = dashboardData.lastUpdatedAt ? formatDateTime(dashboardData.lastUpdatedAt) : "--";
    els.dashLastUpdate.textContent = lastLabel;
  }

  const statusMap = [...countDashboardBy(records, (record) => record.statusCurrent).entries()].sort((a, b) => b[1] - a[1]);
  const projectRecords = records.filter((record) => record.project && record.project !== "-");
  const projectMap = [...countDashboardBy(projectRecords, (record) => record.project).entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const organRecords = records.filter((record) => record.organ && record.organ !== "-");
  const organMap = [...countDashboardBy(organRecords, (record) => record.organ).entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  renderDashboardBars(els.dashChartStatus, statusMap, total, (label) => dashboardStatusInfo(label).color);
  renderDashboardBars(els.dashChartProject, projectMap, total);
  renderDashboardBars(els.dashChartOrgan, organMap, total);

  if (els.dashTableBody) {
    els.dashTableBody.innerHTML = records.length
      ? records
          .map((record) => {
            const situation = dashboardSituation(record);
            const rowClass = `${record.changed ? "dashboard-row-changed" : ""} ${record.error ? "dashboard-row-error" : ""}`.trim();
            return `
              <tr class="${rowClass}">
                <td>${escapeHtml(record.project)}</td>
                <td>${escapeHtml(record.organ)}</td>
                <td><strong>${escapeHtml(record.number)}</strong></td>
                <td><span class="dash-badge ${dashboardBadgeClass(record.statusCurrent)}">${escapeHtml(record.statusCurrent)}</span></td>
                <td>${escapeHtml(record.statusPrevious || "-")}</td>
                <td><span class="dash-badge ${dashboardBadgeClass(situation)}">${escapeHtml(situation)}</span></td>
                <td>${escapeHtml(record.observation || "-")}</td>
                <td>${formatDateTime(record.consultedAt)}</td>
                <td>${dashboardDuration(record)}</td>
                <td><span class="dash-badge ${record.changed ? "dash-badge-amber" : "dash-badge-gray"}">${dashboardBooleanLabel(record.changed)}</span></td>
                <td class="${record.error ? "dashboard-error-text" : ""}">${record.error ? "Sim" : "Nao"}</td>
                <td>
                  <div class="dashboard-row-actions">
                    <button type="button" data-dashboard-action="history" data-id="${escapeHtml(record.id)}">Ver historico</button>
                    <button type="button" data-dashboard-action="edit" data-id="${escapeHtml(record.id)}">Editar</button>
                    <button type="button" data-dashboard-action="inactive" data-id="${escapeHtml(record.id)}">Inativar</button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="12" class="dashboard-empty-table">Nenhum protocolo encontrado com os filtros atuais.</td></tr>`;
  }

  const changedRecords = records.filter((record) => record.changed);
  const errorRecords = records.filter((record) => record.error);
  const staleRecords = records.filter((record) => record.noUpdate);

  if (els.dashChangesList) {
    els.dashChangesList.innerHTML = changedRecords.length
      ? changedRecords
          .map(
            (record) =>
              `<li>${escapeHtml(record.number)}: ${escapeHtml(record.statusPrevious || "-")} -> ${escapeHtml(record.statusCurrent)}.</li>`
          )
          .join("")
      : `<li>Sem mudancas recentes.</li>`;
  }
  if (els.dashErrorsList) {
    els.dashErrorsList.innerHTML = errorRecords.length
      ? errorRecords
          .map((record) => `<li>${escapeHtml(record.number)}: ${escapeHtml(record.queryError || "Erro na consulta")}</li>`)
          .join("")
      : `<li>Sem erros de consulta.</li>`;
  }
  if (els.dashStaleList) {
    els.dashStaleList.innerHTML = staleRecords.length
      ? staleRecords
          .map((record) => `<li>${escapeHtml(record.number)} sem atualizacao desde ${formatDateTime(record.consultedAt)}.</li>`)
          .join("")
      : `<li>Sem protocolos sem atualizacao.</li>`;
  }
}

function filteredProtocols() {
  const query = normalize(state.query);
  return state.protocols
    .filter((protocol) => !state.company || (protocol.companyName || protocol.organ) === state.company.name)
    .filter((protocol) => state.status === "todos" || protocol.status === state.status)
    .filter((protocol) => {
      const searchable = normalize(
        [protocol.number, protocol.person, protocol.organ, protocol.department, protocol.subject].join(" ")
      );
      return searchable.includes(query);
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderMetrics() {
  const uniqueOrgans = new Set(state.protocols.map((protocol) => protocol.organ));
  els.totalProtocols.textContent = state.protocols.length;
  els.openProtocols.textContent = state.protocols.filter((protocol) => protocol.status === "Em andamento").length;
  els.highPriority.textContent = state.protocols.filter((protocol) => protocol.priority === "Alta").length;
  els.totalOrgans.textContent = uniqueOrgans.size;
}

function renderTable() {
  const protocols = filteredProtocols();
  els.resultCount.textContent = `${protocols.length} ${protocols.length === 1 ? "registro encontrado" : "registros encontrados"}`;

  if (!protocols.length) {
    els.table.innerHTML = `<div class="empty-row">Nenhum protocolo encontrado.</div>`;
    return;
  }

  els.table.innerHTML = protocols
    .map(
      (protocol) => `
        <article class="protocol-card ${protocol.id === state.selectedId ? "selected" : ""}" data-id="${protocol.id}">
          <div class="protocol-main">
            <span class="protocol-number">${escapeHtml(protocol.number)}</span>
            <h3 class="protocol-title">${escapeHtml(protocol.subject)}</h3>
            <span class="protocol-subtitle">${escapeHtml(protocol.person)} - ${escapeHtml(protocol.department)}</span>
            <div class="protocol-badges">
              <span class="pill ${statusClass(protocol.status)}">${escapeHtml(protocol.status)}</span>
              <span class="pill ${priorityClass(protocol.priority)}">${escapeHtml(protocol.priority)}</span>
            </div>
          </div>
          <div class="protocol-meta">
            <div class="meta-item">
              <span>Orgao publico</span>
              <strong>${escapeHtml(protocol.organ)}</strong>
            </div>
            <div class="meta-item">
              <span>Ultima atualizacao</span>
              <strong>${formatDateTime(protocol.updatedAt)}</strong>
            </div>
          </div>
          <div class="row-actions">
            <button class="ghost-button" type="button" data-action="view" data-id="${protocol.id}">Detalhes</button>
            <button class="ghost-button" type="button" data-action="edit" data-id="${protocol.id}">Editar</button>
            <button class="danger-button" type="button" data-action="delete" data-id="${protocol.id}">Remover</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDetails() {
  const protocol = state.protocols.find((item) => item.id === state.selectedId);
  if (!protocol) {
    els.selectedProtocolNumber.textContent = "Selecione um protocolo";
    els.detailsContent.className = "details-empty";
    els.detailsContent.innerHTML = `
      <strong>Aguardando selecao</strong>
    `;
    return;
  }

  els.selectedProtocolNumber.textContent = protocol.number;
  els.detailsContent.className = "details-card";
  els.detailsContent.innerHTML = `
    <dl class="details-list">
      <div><dt>Interessado</dt><dd>${escapeHtml(protocol.person)}</dd></div>
      <div><dt>Documento</dt><dd>${escapeHtml(protocol.document || "-")}</dd></div>
      <div><dt>Orgao</dt><dd>${escapeHtml(protocol.organ)}</dd></div>
      <div><dt>Setor</dt><dd>${escapeHtml(protocol.department)}</dd></div>
      <div><dt>Abertura</dt><dd>${formatDate(protocol.openedAt)}</dd></div>
      <div><dt>Status</dt><dd><span class="pill ${statusClass(protocol.status)}">${escapeHtml(protocol.status)}</span></dd></div>
      <div><dt>Tipo consulta</dt><dd>${escapeHtml(protocol.queryType || "-")}</dd></div>
      <div><dt>Link consulta</dt><dd>${escapeHtml(protocol.queryUrl || "-")}</dd></div>
      <div class="wide"><dt>Assunto</dt><dd>${escapeHtml(protocol.subject)}</dd></div>
      <div class="wide"><dt>Observacoes</dt><dd>${escapeHtml(protocol.notes || "-")}</dd></div>
    </dl>
  `;
}

function renderCompanyFilters() {
  if (!els.companyFilterList) return;
  const companyQuery = normalize(state.companyQuery);
  const companies = COMPANY_LIST.filter((company) => normalize(company.name).includes(companyQuery));

  if (!companies.length) {
    els.companyFilterList.innerHTML = `<div class="empty-company-filter">Nenhuma empresa encontrada.</div>`;
    return;
  }

  els.companyFilterList.innerHTML = companies.map(
    (company) => `
      <button
        class="company-filter-button ${company.id === state.company?.id ? "active" : ""}"
        type="button"
        data-company-id="${company.id}"
        aria-pressed="${company.id === state.company?.id ? "true" : "false"}"
      >
        <span class="company-filter-image">
          <img src="${escapeHtml(company.iconImage || company.image)}" alt="" data-fallback-src="${escapeHtml(company.image)}" />
        </span>
        <span class="company-filter-name">${renderCompanyFilterLabel(company)}</span>
      </button>
    `
  ).join("");
}

function renderCompanyFilterLabel(company) {
  const lines = Array.isArray(company.filterLabel) ? company.filterLabel : [company.name];
  return lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
}

function render() {
  renderCompanyFilters();
  renderMetrics();
  renderTable();
  renderDetails();
  if (els.powerBiDialog?.open) {
    renderDashboard();
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateOrgans() {
  els.organInput.innerHTML = organs.map((organ) => `<option>${organ}</option>`).join("");
}

function populateProjects(selectedProjectId = "") {
  if (!els.projectInput) return;
  const options = state.projects
    .map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(projectName(project))}</option>`)
    .join("");

  els.projectInput.innerHTML = options || `<option value="">Nenhum projeto carregado</option>`;
  els.projectInput.disabled = state.projects.length === 0;
  if (selectedProjectId && state.projects.some((project) => String(project.id) === String(selectedProjectId))) {
    els.projectInput.value = selectedProjectId;
  }
}

function openForm(protocol = null) {
  els.form.reset();
  const selectedProject = fallbackProjectForProtocol(protocol);
  populateProjects(selectedProject?.id || "");
  els.protocolId.value = protocol?.id || "";
  els.dialogTitle.textContent = protocol ? "Editar protocolo" : "Novo protocolo";
  els.numberInput.value = protocol?.number || nextProtocolNumber();
  els.openedAtInput.value = protocol?.openedAt || new Date().toISOString().slice(0, 10);
  els.personInput.value = protocol?.person || "";
  els.documentInput.value = protocol?.document || "";
  els.organInput.value = protocol?.organ || state.company?.name || organs[0];
  if (selectedProject?.id && els.projectInput) {
    els.projectInput.value = selectedProject.id;
  }
  els.departmentInput.value = protocol?.department || "";
  els.statusInput.value = protocol?.status || "Em andamento";
  els.priorityInput.value = protocol?.priority || "Media";
  if (els.queryTypeInput) {
    els.queryTypeInput.value = protocol?.queryType || protocol?.tipo_consulta || queryTypeForOrgan(els.organInput.value);
  }
  if (els.queryUrlInput) {
    els.queryUrlInput.value =
      protocol?.queryUrl ||
      protocol?.link_consulta ||
      defaultQueryUrlForType(els.queryTypeInput?.value) ||
      "";
  }
  els.subjectInput.value = protocol?.subject || "";
  els.notesInput.value = protocol?.notes || "";
  els.dialog.showModal();
  els.personInput.focus();
}

function nextProtocolNumber() {
  const year = new Date().getFullYear();
  const yearProtocols = state.protocols.filter((protocol) => String(protocol.number).startsWith(`${year}-`));
  const next = yearProtocols.length + 1;
  return `${year}-${String(next).padStart(6, "0")}`;
}

function closeForm() {
  els.dialog.close();
}

function switchScreen(screenName) {
  els.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });

  els.screenButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screenTarget === screenName);
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!state.company) return;
  if (!shouldUseApi()) {
    alert("Edicao bloqueada: API nao configurada.");
    return;
  }
  if (isApiReadOnly()) {
    alert("Edicao bloqueada: backend em modo somente leitura.");
    return;
  }
  const id = els.protocolId.value || createId();
  const targetCompany = findCompanyByName(els.organInput.value) || state.company;
  const currentCompany = state.company;
  const wasExisting = state.protocols.some((item) => item.id === id);
  const selectedProject = findProjectById(els.projectInput?.value);
  if (!selectedProject) {
    alert("Selecione um projeto antes de salvar o protocolo.");
    return;
  }
  const backendCompanyId = backendCompanyIdForProject(selectedProject);
  if (!backendCompanyId) {
    alert("Nao foi possivel identificar a empresa do projeto selecionado.");
    return;
  }
  const queryType = els.queryTypeInput?.value || "";
  const queryUrl = els.queryUrlInput?.value.trim() || "";
  if (queryType && !queryUrl) {
    alert("Informe o link de consulta para ativar o scraping deste protocolo.");
    return;
  }
  const protocol = {
    id,
    number: els.numberInput.value.trim(),
    openedAt: els.openedAtInput.value,
    person: els.personInput.value.trim(),
    document: els.documentInput.value.trim(),
    documentoConsulta: els.documentInput.value.trim(),
    projectId: selectedProject.id,
    companyId: backendCompanyId,
    project: projectName(selectedProject),
    organ: targetCompany.name,
    department: els.departmentInput.value.trim(),
    status: els.statusInput.value,
    priority: els.priorityInput.value,
    queryType,
    queryUrl: queryType ? queryUrl : "",
    subject: els.subjectInput.value.trim(),
    notes: els.notesInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const savedProtocol = await api.saveProtocol(targetCompany.id, protocol, {
      isUpdate: wasExisting && targetCompany.id === currentCompany.id,
    });
    Object.assign(protocol, savedProtocol);

    if (wasExisting && targetCompany.id !== currentCompany.id) {
      await api.deleteProtocol(currentCompany.id, id);
    }
  } catch (error) {
    reportApiError("salvar protocolo", error);
    const message = friendlyApiErrorMessage(error, "Nao foi possivel salvar no backend.");
    alert(`Nao foi possivel salvar no backend: ${message}`);
    return;
  }

  if (targetCompany.id === state.company.id) {
    const existingIndex = state.protocols.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      state.protocols[existingIndex] = protocol;
    } else {
      state.protocols.unshift(protocol);
    }

    state.selectedId = protocol.id || id;
    saveProtocolsByCompany(state.company.id);
  } else {
    state.protocols = state.protocols.filter((item) => item.id !== id);
    saveProtocolsByCompany(state.company.id);

    const targetProtocols = (await loadProtocolsByCompany(targetCompany.id)).filter((item) => item.id !== id);
    targetProtocols.unshift(protocol);
    saveProtocolsByCompany(targetCompany.id, targetProtocols);

    state.company = targetCompany;
    state.protocols = targetProtocols;
    state.selectedId = protocol.id || id;
    applySessionToUi();
    localStorage.setItem(SESSION_KEY, targetCompany.id);
  }

  closeForm();
  switchScreen("protocols");
  render();
}

async function removeProtocol(id) {
  if (!state.company) return;
  if (!shouldUseApi()) {
    alert("Remocao bloqueada: API nao configurada.");
    return;
  }
  if (isApiReadOnly()) {
    alert("Remocao bloqueada: backend em modo somente leitura.");
    return;
  }
  const protocol = state.protocols.find((item) => item.id === id);
  if (!protocol) return;

  const confirmed = confirm(`Remover o protocolo ${protocol.number}?`);
  if (!confirmed) return;

  try {
    await api.deleteProtocol(state.company.id, id);
  } catch (error) {
    reportApiError("remover protocolo", error);
    alert("Nao foi possivel remover no backend. Nenhuma alteracao local foi aplicada.");
    return;
  }

  state.protocols = state.protocols.filter((item) => item.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  saveProtocolsByCompany(state.company.id);
  render();
}

function isValidHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildPowerBiEmbedUrl(url) {
  try {
    const parsed = new URL(url);

    // Improves embed UX when using secure embed links.
    if (parsed.pathname.includes("/reportEmbed") && !parsed.searchParams.has("autoAuth")) {
      parsed.searchParams.set("autoAuth", "true");
    }

    if (!parsed.searchParams.has("chromeless")) {
      parsed.searchParams.set("chromeless", "1");
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function closePowerBiDialog() {
  closeDashboardHistoryDialog();
  if (els.powerBiDialog?.open) {
    els.powerBiDialog.close();
  }
}

async function openPowerBiDashboard() {
  if (!shouldUseApi()) {
    alert("Dashboard indisponivel sem conexao com a FastAPI.");
    return;
  }
  await loadDashboardData();
  renderDashboard();
  if (els.powerBiDialog && typeof els.powerBiDialog.showModal === "function") {
    els.powerBiDialog.showModal();
    return;
  }

  alert("Seu navegador nao suporta modal de dashboard.");
}

async function runDashboardQuery() {
  dashboardUiState.lastRunAt = new Date();
  if (!shouldUseApi()) {
    alert("Configure a API para atualizar os protocolos do dashboard.");
    return;
  }

  const originalButtonText = els.dashboardRunButton?.textContent || "Atualizar protocolos";
  if (els.dashboardRunButton) {
    els.dashboardRunButton.disabled = true;
    els.dashboardRunButton.textContent = "Atualizando...";
  }

  try {
    const runResult = await api.runDashboard(state.company?.id).catch(() => ({ executed: false, items: [] }));
    await loadDashboardData();
    renderDashboard();
    if (!runResult.executed && els.dashboardLastMeta) {
      els.dashboardLastMeta.textContent = `${els.dashboardLastMeta.textContent} - scraping nao executado pelo backend`;
    }
  } catch (error) {
    reportApiError("executar consulta", error);
    const message = friendlyApiErrorMessage(error, "Falha ao atualizar protocolos.");
    alert(`Falha ao atualizar protocolos: ${message}`);
  } finally {
    if (els.dashboardRunButton) {
      els.dashboardRunButton.disabled = false;
      els.dashboardRunButton.textContent = originalButtonText;
    }
  }
}

async function refreshProtocolsNow() {
  if (!state.company) return;
  dashboardUiState.lastRunAt = new Date();

  if (!shouldUseApi()) {
    alert("Configure a API para atualizar protocolos.");
    return;
  }

  const originalButtonText = els.refreshProtocolsButton?.textContent || "Atualizar protocolos";
  if (els.refreshProtocolsButton) {
    els.refreshProtocolsButton.disabled = true;
    els.refreshProtocolsButton.textContent = "Atualizando...";
  }

  try {
    const runResult = await api.runDashboard(state.company.id).catch(() => ({ executed: false, items: [] }));
    state.protocols = await loadProtocolsByCompany(state.company.id);
    if (!runResult.executed && els.companyScopeLabel) {
      els.companyScopeLabel.textContent = `${state.protocols.length} protocolo(s) carregado(s) do banco; scraping nao executado pelo backend`;
    }
    if (state.selectedId && !state.protocols.some((protocol) => protocol.id === state.selectedId)) {
      state.selectedId = null;
    }
    await loadDashboardData();
    render();
    if (els.powerBiDialog?.open) {
      renderDashboard();
    }
  } catch (error) {
    reportApiError("atualizar protocolos", error);
    const message = friendlyApiErrorMessage(error, "Falha ao atualizar protocolos.");
    alert(`Falha ao atualizar protocolos: ${message}`);
  } finally {
    if (els.refreshProtocolsButton) {
      els.refreshProtocolsButton.disabled = false;
      els.refreshProtocolsButton.textContent = originalButtonText;
    }
  }
}

function exportDashboardCsv() {
  const records = filteredDashboardRecords();
  const headers = [
    "Projeto",
    "Orgao/site",
    "Protocolo",
    "Status atual",
    "Status anterior",
    "Situacao",
    "Observacao",
    "Data/hora consulta",
    "Duracao",
    "Mudou",
    "Erro",
  ];
  const rows = records.map((record) => [
    record.project,
    record.organ,
    record.number,
    record.statusCurrent,
    record.statusPrevious,
    dashboardSituation(record),
    record.observation,
    formatDateTime(record.consultedAt),
    dashboardDuration(record),
    dashboardBooleanLabel(record.changed),
    dashboardBooleanLabel(record.error),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dashboard-protocolos.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dashboardPdfFilterSummary() {
  const filters = [];
  if (dashboardUiState.project !== "todos") filters.push(`Projeto: ${dashboardUiState.project}`);
  if (dashboardUiState.organ !== "todos") filters.push(`Orgao/site: ${dashboardUiState.organ}`);
  if (dashboardUiState.status !== "todos") filters.push(`Status: ${dashboardUiState.status}`);
  if (dashboardUiState.situation !== "todos") filters.push(`Situacao: ${dashboardUiState.situation}`);
  if (dashboardUiState.period !== "todos") filters.push(`Periodo: ultimos ${dashboardUiState.period} dias`);
  if (dashboardUiState.onlyChanged) filters.push("Somente com mudanca");
  if (dashboardUiState.onlyError) filters.push("Somente com erro");
  return filters.length ? filters.join(" | ") : "Todos os registros";
}

function generateDashboardPdf() {
  syncDashboardFilterState();
  const records = filteredDashboardRecords();
  const total = records.length;
  const finished = records.filter((record) => dashboardSituation(record) === "Finalizado").length;
  const changed = records.filter((record) => record.changed).length;
  const errors = records.filter((record) => record.error).length;
  const lastRun = dashboardData.lastUpdatedAt || dashboardUiState.lastRunAt?.toISOString() || new Date().toISOString();
  const generatedAt = new Date().toISOString();

  const rows = records.length
    ? records
        .map((record, index) => {
          const situation = dashboardSituation(record);
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(record.project)}</td>
              <td>${escapeHtml(record.organ)}</td>
              <td><strong>${escapeHtml(record.number)}</strong></td>
              <td><span class="badge">${escapeHtml(record.statusCurrent)}</span></td>
              <td>${escapeHtml(situation)}</td>
              <td>${escapeHtml(record.observation || "-")}</td>
              <td>${formatDateTime(record.consultedAt)}</td>
              <td>${dashboardDuration(record)}</td>
              <td>${dashboardBooleanLabel(record.changed)}</td>
              <td>${dashboardBooleanLabel(record.error)}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="11" class="empty">Nenhum protocolo encontrado com os filtros atuais.</td></tr>`;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Dashboard de Protocolos</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #172033;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
          }
          .report-header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 2px solid #1d4ed8;
          }
          .eyebrow {
            margin: 0 0 4px;
            color: #1d4ed8;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }
          h1 {
            margin: 0;
            color: #0f172a;
            font-size: 24px;
            line-height: 1.1;
          }
          .meta {
            margin: 6px 0 0;
            color: #475569;
            font-size: 10px;
            line-height: 1.5;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin: 12px 0;
          }
          .card {
            min-height: 52px;
            padding: 10px 12px;
            border: 1px solid #dbe5f2;
            border-left: 4px solid #2563eb;
            border-radius: 7px;
            background: #f8fbff;
          }
          .card span {
            display: block;
            color: #64748b;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .card strong {
            display: block;
            margin-top: 4px;
            color: #0f172a;
            font-size: 20px;
            line-height: 1;
          }
          .filters {
            margin: 0 0 10px;
            padding: 8px 10px;
            border: 1px solid #dbe5f2;
            border-radius: 7px;
            color: #334155;
            background: #ffffff;
            font-size: 10px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          thead { display: table-header-group; }
          th {
            padding: 7px 6px;
            border: 1px solid #cbd5e1;
            color: #334155;
            background: #eaf1fb;
            font-size: 8px;
            text-align: left;
            text-transform: uppercase;
          }
          td {
            padding: 7px 6px;
            border: 1px solid #e2e8f0;
            color: #1f2937;
            font-size: 8.5px;
            line-height: 1.25;
            vertical-align: top;
            word-break: break-word;
          }
          tbody tr:nth-child(even) td { background: #f8fafc; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 999px;
            color: #1d4ed8;
            background: #dbeafe;
            font-weight: 800;
            white-space: nowrap;
          }
          .empty {
            padding: 20px;
            color: #64748b;
            text-align: center;
            font-weight: 800;
          }
          .col-index { width: 28px; }
          .col-project { width: 120px; }
          .col-organ { width: 95px; }
          .col-number { width: 120px; }
          .col-status { width: 82px; }
          .col-situation { width: 95px; }
          .col-date { width: 92px; }
          .col-duration { width: 58px; }
          .col-flag { width: 48px; }
        </style>
      </head>
      <body>
        <header class="report-header">
          <div>
            <p class="eyebrow">Relatorio gerencial</p>
            <h1>Dashboard de Protocolos</h1>
            <p class="meta">Ultima consulta: ${formatDateTime(lastRun)}<br />Gerado em: ${formatDateTime(generatedAt)}</p>
          </div>
          <div class="meta">Fonte: FastAPI<br />Registros filtrados: ${total}</div>
        </header>

        <section class="summary">
          <article class="card"><span>Total</span><strong>${total}</strong></article>
          <article class="card"><span>Finalizados</span><strong>${finished}</strong></article>
          <article class="card"><span>Mudancas</span><strong>${changed}</strong></article>
          <article class="card"><span>Erros</span><strong>${errors}</strong></article>
        </section>

        <div class="filters">${escapeHtml(dashboardPdfFilterSummary())}</div>

        <table>
          <thead>
            <tr>
              <th class="col-index">#</th>
              <th class="col-project">Projeto</th>
              <th class="col-organ">Orgao/site</th>
              <th class="col-number">Protocolo</th>
              <th class="col-status">Status</th>
              <th class="col-situation">Situacao</th>
              <th>Observacao</th>
              <th class="col-date">Consulta</th>
              <th class="col-duration">Duracao</th>
              <th class="col-flag">Mudou</th>
              <th class="col-flag">Erro</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  const frame = document.createElement("iframe");
  frame.className = "dashboard-print-frame";
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument || frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    frame.remove();
    alert("Nao foi possivel preparar o PDF neste navegador.");
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const removeFrame = () => setTimeout(() => frame.remove(), 500);
  frameWindow.onafterprint = removeFrame;
  setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    removeFrame();
  }, 250);
}

function importDashboardFile(file) {
  if (!file || !state.company) return;
  if (!shouldUseApi()) {
    alert("Importacao bloqueada: API nao configurada.");
    return;
  }
  if (isApiReadOnly()) {
    alert("Importacao bloqueada: backend em modo somente leitura.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const lines = String(reader.result || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      alert("Planilha sem registros para importar.");
      return;
    }
    const selectedProject = state.projects[0];
    const backendCompanyId = backendCompanyIdForProject(selectedProject);
    if (!selectedProject || !backendCompanyId) {
      alert("Importacao bloqueada: nenhum projeto carregado para vincular aos protocolos.");
      return;
    }

    const separator = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
    const imported = lines.slice(1).map((line) => {
      const cells = line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ""));
      const organ = cells[2] || state.company.name;
      const queryType = queryTypeForOrgan(organ);
      return {
        id: createId(),
        number: cells[1] || nextProtocolNumber(),
        openedAt: new Date().toISOString().slice(0, 10),
        person: cells[0] || "-",
        document: cells[5] || "",
        documentoConsulta: cells[5] || "",
        projectId: selectedProject.id,
        companyId: backendCompanyId,
        project: projectName(selectedProject),
        organ,
        department: "Importacao",
        status: cells[4] || "Em andamento",
        priority: "Media",
        queryType,
        queryUrl: cells[10] || defaultQueryUrlForType(queryType),
        subject: cells[3] || "-",
        notes: cells[9] || "",
        updatedAt: new Date().toISOString(),
      };
    });

    let savedProtocols = [];
    try {
      savedProtocols = await Promise.all(
        imported.map((protocol) => api.saveProtocol(state.company.id, protocol, { isUpdate: false }))
      );
    } catch (error) {
      reportApiError("importar protocolos", error);
      alert("Nao foi possivel importar no backend. Nenhuma alteracao local foi aplicada.");
      return;
    }

    state.protocols = [...savedProtocols, ...state.protocols];
    saveProtocolsByCompany(state.company.id);
    dashboardUiState.lastRunAt = new Date();
    render();
  };
  reader.readAsText(file);
}

function resetDashboardFilters() {
  dashboardUiState.project = "todos";
  dashboardUiState.organ = "todos";
  dashboardUiState.status = "todos";
  dashboardUiState.situation = "todos";
  dashboardUiState.period = "todos";
  dashboardUiState.onlyChanged = false;
  dashboardUiState.onlyError = false;

  if (els.dashFilterProject) els.dashFilterProject.value = "todos";
  if (els.dashFilterOrgan) els.dashFilterOrgan.value = "todos";
  if (els.dashFilterStatus) els.dashFilterStatus.value = "todos";
  if (els.dashFilterSituation) els.dashFilterSituation.value = "todos";
  if (els.dashFilterPeriod) els.dashFilterPeriod.value = "todos";
  if (els.dashOnlyChanged) els.dashOnlyChanged.checked = false;
  if (els.dashOnlyError) els.dashOnlyError.checked = false;

  renderDashboard();
}

function closeDashboardHistoryDialog() {
  if (els.dashboardHistoryDialog?.open) {
    els.dashboardHistoryDialog.close();
  }
}

function renderDashboardHistoryRows(history) {
  if (!history.length) {
    return `<p class="dashboard-empty">Nao ha consultas anteriores para este protocolo.</p>`;
  }

  return `
    <table class="dashboard-history-table" aria-label="Historico de consultas">
      <thead>
        <tr>
          <th>Data/hora consulta</th>
          <th>Mudou</th>
          <th>Erro</th>
          <th>Status anterior</th>
          <th>Status atual</th>
          <th>Observacao</th>
          <th>Duracao</th>
        </tr>
      </thead>
      <tbody>
        ${history
          .map(
            (item) => `
              <tr>
                <td>${formatDateTime(item.consultedAt)}</td>
                <td>${dashboardBooleanLabel(item.changed)}</td>
                <td class="${item.erro ? "dashboard-error-text" : ""}">${dashboardBooleanLabel(item.erro)}</td>
                <td>${escapeHtml(item.statusPrevious || "-")}</td>
                <td>${escapeHtml(item.statusCurrent || "-")}</td>
                <td>${escapeHtml(item.observation || "-")}</td>
                <td>${escapeHtml(item.durationLabel || "-")}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function openDashboardHistory(record) {
  if (!record || !els.dashboardHistoryDialog) return;

  if (els.dashboardHistoryTitle) {
    els.dashboardHistoryTitle.textContent = `Historico do protocolo ${record.number}`;
  }
  if (els.dashboardHistoryMeta) {
    els.dashboardHistoryMeta.textContent = `Ultima consulta: ${formatDateTime(record.consultedAt)} | Mudou: ${dashboardBooleanLabel(record.changed)} | Erro: ${dashboardBooleanLabel(record.error)} | Status anterior: ${record.statusPrevious || "-"} | Status atual: ${record.statusCurrent || "-"}`;
  }
  if (els.dashboardHistoryBody) {
    els.dashboardHistoryBody.innerHTML = `<p class="dashboard-empty">Carregando historico...</p>`;
  }

  let history = Array.isArray(record.history) ? [...record.history] : [];
  if (!history.length && dashboardData.historyByProtocol[record.id]) {
    history = [...dashboardData.historyByProtocol[record.id]];
  }

  if (!history.length && shouldUseApi()) {
    try {
      const backendHistory = await api.getDashboardHistory(record.historyRef || record.id);
      history = backendHistory.map((entry) => mapDashboardHistoryEntry(entry, record));
      dashboardData.historyByProtocol[record.id] = history;
    } catch (error) {
      reportApiError("carregar historico do protocolo", error);
    }
  }

  history.sort((a, b) => new Date(b.consultedAt || 0) - new Date(a.consultedAt || 0));
  if (els.dashboardHistoryBody) {
    els.dashboardHistoryBody.innerHTML = renderDashboardHistoryRows(history);
  }

  if (els.dashboardHistoryDialog.open) return;
  if (typeof els.dashboardHistoryDialog.showModal === "function") {
    els.dashboardHistoryDialog.showModal();
  }
}

async function handleDashboardTableAction(event) {
  const button = event.target.closest("[data-dashboard-action]");
  if (!button) return;
  const { dashboardAction, id } = button.dataset;
  const protocol = state.protocols.find((item) => item.id === id);
  const dashboardRecord = buildDashboardRecords().find((item) => item.id === id);

  if (dashboardAction === "history") {
    await openDashboardHistory(dashboardRecord);
    return;
  }

  if (dashboardAction === "edit") {
    if (!protocol) {
      alert("Este protocolo nao esta disponivel para edicao na empresa selecionada.");
      return;
    }
    closePowerBiDialog();
    openForm(protocol);
  }

  if (dashboardAction === "inactive") {
    if (!protocol) {
      alert("Este protocolo nao esta disponivel para inativacao na empresa selecionada.");
      return;
    }
    protocol.status = "Arquivado";
    protocol.updatedAt = new Date().toISOString();

    if (!shouldUseApi()) {
      alert("Inativacao bloqueada: API nao configurada.");
      return;
    }
    if (isApiReadOnly()) {
      alert("Inativacao bloqueada: backend em modo somente leitura.");
      return;
    }
    try {
      await api.saveProtocol(state.company.id, protocol, { isUpdate: true });
    } catch (error) {
      reportApiError("inativar protocolo", error);
      alert("Nao foi possivel inativar no backend. Nenhuma alteracao local foi aplicada.");
      return;
    }

    saveProtocolsByCompany(state.company.id);
    render();
  }
}

function applySessionToUi() {
  if (els.currentCompanyName) {
    els.currentCompanyName.textContent = state.company?.name || "Empresa ativa";
  }
  if (els.companyScopeLabel) {
    els.companyScopeLabel.textContent = shouldUseApi()
      ? "Protocolos carregados do backend"
      : "Protocolos filtrados por empresa";
  }
}

async function selectCompany(company, options = {}) {
  if (!company) return;

  state.user = {
    id: `${company.id}-operator`,
    name: `Operador ${company.name}`,
  };
  state.company = company;
  state.protocols = await loadProtocolsByCompany(company.id);
  state.selectedId = null;
  state.query = "";
  state.status = "todos";

  if (els.searchInput) els.searchInput.value = "";
  if (els.statusFilter) els.statusFilter.value = "todos";

  applySessionToUi();
  localStorage.setItem(SESSION_KEY, company.id);
  render();

  if (options.showProtocols) {
    switchScreen("protocols");
  }
}

function openCompanyFilter() {
  closePowerBiDialog();
  switchScreen("protocols");
  document.querySelector("#companyFilterTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function logout() {
  localStorage.removeItem("bpk_prati_logged");
  localStorage.removeItem(SESSION_KEY);
  const tokenKey = window.BPK_CONFIG?.AUTH_TOKEN_KEY || "bpk_auth_token";
  localStorage.removeItem(tokenKey);
  window.location.replace("login.html");
}

function bindEvents() {
  els.companyShortcutButton?.addEventListener("click", logout);
  els.refreshProtocolsButton?.addEventListener("click", refreshProtocolsNow);
  els.newProtocolButton.addEventListener("click", () => openForm());
  els.closeDialogButton.addEventListener("click", closeForm);
  els.cancelButton.addEventListener("click", closeForm);
  els.form.addEventListener("submit", handleSubmit);
  els.organInput?.addEventListener("change", () => applyQueryDefaultsForOrgan(true));
  els.queryTypeInput?.addEventListener("change", () => {
    if (els.queryUrlInput && !els.queryUrlInput.value) {
      els.queryUrlInput.value = defaultQueryUrlForType(els.queryTypeInput.value);
    }
  });
  els.powerBiButton.addEventListener("click", openPowerBiDashboard);
  els.closePowerBiButton?.addEventListener("click", closePowerBiDialog);
  els.closeDashboardHistoryButton?.addEventListener("click", closeDashboardHistoryDialog);
  els.dashboardHistoryDialog?.addEventListener("cancel", closeDashboardHistoryDialog);
  els.dashboardRunButton?.addEventListener("click", runDashboardQuery);
  els.dashboardPdfButton?.addEventListener("click", generateDashboardPdf);
  els.dashboardExportButton?.addEventListener("click", exportDashboardCsv);
  els.dashboardCloseButton?.addEventListener("click", closePowerBiDialog);
  els.dashboardNewProtocolButton?.addEventListener("click", () => {
    closePowerBiDialog();
    openForm();
  });
  els.dashboardImportButton?.addEventListener("click", () => els.dashboardImportInput?.click());
  els.dashboardImportInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    importDashboardFile(file);
    event.target.value = "";
  });
  els.dashResetFiltersButton?.addEventListener("click", resetDashboardFilters);
  els.dashTableBody?.addEventListener("click", handleDashboardTableAction);

  [
    els.dashFilterProject,
    els.dashFilterOrgan,
    els.dashFilterStatus,
    els.dashFilterSituation,
    els.dashFilterPeriod,
    els.dashOnlyChanged,
    els.dashOnlyError,
  ].forEach((field) => {
    field?.addEventListener("change", () => {
      syncDashboardFilterState();
      renderDashboard();
    });
  });

  els.screenButtons.forEach((button) => {
    button.addEventListener("click", () => switchScreen(button.dataset.screenTarget));
  });

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTable();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderTable();
  });

  els.companySearchInput?.addEventListener("input", (event) => {
    state.companyQuery = event.target.value;
    renderCompanyFilters();
  });

  els.companyFilterList?.addEventListener("click", (event) => {
    const button = event.target.closest(".company-filter-button[data-company-id]");
    if (!button) return;

    selectCompany(findCompany(button.dataset.companyId), { showProtocols: true });
  });

  els.companyFilterList?.addEventListener(
    "error",
    (event) => {
      const image = event.target.closest("img[data-fallback-src]");
      if (!image || image.src.endsWith(image.dataset.fallbackSrc)) return;
      image.src = image.dataset.fallbackSrc;
    },
    true
  );

  els.table.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    const card = event.target.closest(".protocol-card[data-id]");

    if (actionButton) {
      const { action, id } = actionButton.dataset;
      const protocol = state.protocols.find((item) => item.id === id);
      if (action === "view") {
        state.selectedId = id;
        render();
        switchScreen("details");
      }
      if (action === "edit") openForm(protocol);
      if (action === "delete") removeProtocol(id);
      return;
    }

    if (card) {
      state.selectedId = card.dataset.id;
      render();
      switchScreen("details");
    }
  });
}

async function bootstrap() {
  if (localStorage.getItem("bpk_prati_logged") !== "1") {
    window.location.replace("login.html");
    return;
  }
  populateOrgans();
  bindEvents();
  const activeCompany = findCompany(localStorage.getItem(SESSION_KEY)) || COMPANY_LIST[0];
  await selectCompany(activeCompany);
}

bootstrap();

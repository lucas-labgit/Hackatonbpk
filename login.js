const SESSION_KEY = "bpk_active_company";
const PRATI_SESSION = "bpk_prati_logged";

// Altere aqui as credenciais locais
const PRATI_USER = { username: "prati", password: "Prati@360" };

const els = {
  loginForm: document.querySelector("#loginForm"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  loginError: document.querySelector("#loginError"),
  submitBtn: document.querySelector(".primary-button[type='submit']"),
};

function setLoading(loading) {
  if (!els.submitBtn) return;
  els.submitBtn.disabled = loading;
  els.submitBtn.textContent = loading ? "Verificando..." : "Acessar";
}

function isLocalCredentialValid(username, password) {
  return username.toLowerCase() === PRATI_USER.username && password === PRATI_USER.password;
}

function finishLogin() {
  localStorage.setItem(PRATI_SESSION, "1");
  localStorage.setItem(SESSION_KEY, "emp01");
  window.location.replace("index.html");
}

async function handleLogin(event) {
  event.preventDefault();
  els.loginError.textContent = "";

  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value;
  const localCredentialValid = isLocalCredentialValid(username, password);

  if (!username || !password) {
    els.loginError.textContent = "Preencha usuario e senha.";
    return;
  }

  setLoading(true);

  const config = window.BPK_CONFIG || {};
  const apiUrl = String(config.API_BASE_URL || "").replace(/\/+$/, "");
  const authEnabled = config.AUTH_ENABLED !== false;
  const useApi = authEnabled && Boolean(apiUrl && apiUrl.startsWith("http"));

  if (useApi) {
    try {
      const emailValue = username.includes("@") ? username : "admin@biopark.com";
      const res = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, username, password }),
      });

      if (res.ok) {
        finishLogin();
        return;
      }

      // API recusou: se credencial local for valida, permite login local
      if (!localCredentialValid) {
        els.loginError.textContent = "Usuario ou senha invalidos.";
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("API indisponivel, usando autenticacao local:", err);
      if (!localCredentialValid) {
        els.loginError.textContent = "Usuario ou senha invalidos.";
        setLoading(false);
        return;
      }
    }
  }

  if (!localCredentialValid) {
    els.loginError.textContent = "Usuario ou senha invalidos.";
    setLoading(false);
    return;
  }

  finishLogin();
}

function init() {
  if (localStorage.getItem(PRATI_SESSION) === "1") {
    window.location.replace("index.html");
    return;
  }
  els.loginForm.addEventListener("submit", handleLogin);
  els.usernameInput.addEventListener("input", () => {
    els.loginError.textContent = "";
  });
  els.passwordInput.addEventListener("input", () => {
    els.loginError.textContent = "";
  });
}

init();

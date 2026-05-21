import hashlib
import hmac
import json
import os
import re
import secrets
import sys
from datetime import date, datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request, urlopen


SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
PROTOCOLS_TABLE = os.environ.get("SUPABASE_PROTOCOLS_TABLE", "protocolos")
PROJECTS_TABLE = os.environ.get("SUPABASE_PROJECTS_TABLE", "projetos")
HISTORY_TABLE = os.environ.get("SUPABASE_HISTORY_TABLE", "historico_consultas")

APP_EMAIL = os.environ.get("BPK_EMAIL", "admin@biopark.com")
APP_PASSWORD = os.environ.get("BPK_SENHA", "admin123")
SESSION_SECRET = os.environ.get("BPK_SESSION_SECRET", "desafio4-supabase-secret")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("BPK_CORS_ORIGINS", "*").split(",")
    if origin.strip()
]


class BackendError(RuntimeError):
    def __init__(self, message, status=HTTPStatus.BAD_GATEWAY, details=None):
        super().__init__(message)
        self.status = status
        self.details = details


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def parse_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def duration_days(opened, finished):
    start = parse_date(opened)
    if not start:
        return None
    end = parse_date(finished) or date.today().isoformat()
    return (date.fromisoformat(end) - date.fromisoformat(start)).days


def priority_from_status(status):
    text = (status or "").lower()
    if "aguard" in text or "erro" in text:
        return "Alta"
    if "conclu" in text or "final" in text or "aprova" in text:
        return "Baixa"
    return "Media"


def make_signature(value):
    return hmac.new(SESSION_SECRET.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def make_session(email):
    raw = f"{email}:{secrets.token_urlsafe(24)}"
    return f"{raw}:{make_signature(raw)}"


def valid_session(cookie_header):
    cookie = SimpleCookie(cookie_header or "")
    token = cookie.get("bpk_session")
    if not token:
        return False
    parts = token.value.rsplit(":", 1)
    if len(parts) != 2:
        return False
    raw, signature = parts
    return hmac.compare_digest(make_signature(raw), signature)


def require_supabase_config():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise BackendError(
            "SUPABASE_URL e SUPABASE_KEY precisam estar configurados no ambiente.",
            HTTPStatus.INTERNAL_SERVER_ERROR,
        )


def supabase_request(method, table, params=None, payload=None, prefer=None):
    require_supabase_config()
    query = f"?{urlencode(params, doseq=True)}" if params else ""
    url = f"{SUPABASE_URL}/rest/v1/{quote(table)}{query}"
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    try:
        with urlopen(Request(url, data=body, method=method, headers=headers), timeout=25) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(raw)
        except json.JSONDecodeError:
            details = raw
        raise BackendError("Erro retornado pelo Supabase.", HTTPStatus.BAD_GATEWAY, details) from exc
    except URLError as exc:
        raise BackendError("Nao foi possivel conectar ao Supabase.", HTTPStatus.BAD_GATEWAY, str(exc)) from exc


def project_name_from_row(row):
    embedded = row.get(PROJECTS_TABLE)
    if isinstance(embedded, dict):
        return embedded.get("nome")
    return (
        row.get("projeto_nome")
        or row.get("project")
        or row.get("person")
        or row.get("interessado")
        or "Sem projeto"
    )


def frontend_protocol(row):
    status = row.get("status_atual") or row.get("status") or "Pendente"
    opened = row.get("data_abertura") or row.get("openedAt")
    finished = row.get("data_finalizacao") or row.get("finishedAt")
    return {
        "id": str(row.get("id")),
        "number": row.get("numero_protocolo") or row.get("number") or "",
        "openedAt": opened,
        "person": project_name_from_row(row),
        "document": row.get("document") or row.get("documento") or "",
        "organ": row.get("orgao") or row.get("organ") or "",
        "department": row.get("responsavel") or row.get("department") or "",
        "status": status,
        "priority": row.get("priority") or priority_from_status(status),
        "subject": row.get("tipo_consulta") or row.get("subject") or "",
        "notes": row.get("observacao") or row.get("notes") or row.get("situacao") or "",
        "updatedAt": row.get("updated_at") or row.get("updatedAt") or row.get("created_at") or now_iso(),
        "active": bool(row.get("ativo", True)),
        "finishedAt": finished,
        "situation": row.get("situacao"),
        "durationDays": duration_days(opened, finished),
    }


def query_protocols():
    params = {
        "select": f"*,{PROJECTS_TABLE}(nome)",
        "order": "updated_at.desc,id.desc",
    }
    try:
        rows = supabase_request("GET", PROTOCOLS_TABLE, params=params)
    except BackendError:
        rows = supabase_request(
            "GET",
            PROTOCOLS_TABLE,
            params={"select": "*", "order": "updated_at.desc,id.desc"},
        )
    return [frontend_protocol(row) for row in (rows or []) if row.get("ativo", True)]


def get_or_create_project_id(name):
    project_name = clean(name) or "Sem projeto"
    params = {"select": "id", "nome": f"eq.{project_name}", "limit": "1"}
    rows = supabase_request("GET", PROJECTS_TABLE, params=params)
    if rows:
        return rows[0]["id"]
    created = supabase_request(
        "POST",
        PROJECTS_TABLE,
        payload={"nome": project_name},
        prefer="return=representation",
    )
    return created[0]["id"]


def protocol_from_payload(payload):
    return {
        "project": clean(payload.get("person")) or clean(payload.get("project")) or "Sem projeto",
        "number": clean(payload.get("number")) or clean(payload.get("numero_protocolo")),
        "organ": clean(payload.get("organ")) or clean(payload.get("orgao")),
        "responsible": clean(payload.get("department")) or clean(payload.get("responsavel")),
        "activity": clean(payload.get("subject")) or clean(payload.get("tipo_consulta")),
        "status": clean(payload.get("status")) or "Pendente",
        "notes": clean(payload.get("notes")) or clean(payload.get("observacao")),
        "opened": parse_date(payload.get("openedAt") or payload.get("data_abertura")),
        "finished": parse_date(payload.get("finishedAt") or payload.get("data_finalizacao")),
    }


def supabase_protocol_payload(payload):
    project_id = get_or_create_project_id(payload["project"])
    return {
        "projeto_id": project_id,
        "numero_protocolo": payload["number"],
        "orgao": payload["organ"],
        "responsavel": payload["responsible"],
        "tipo_consulta": payload["activity"],
        "status_atual": payload["status"],
        "situacao": payload["status"],
        "observacao": payload["notes"],
        "data_abertura": payload["opened"],
        "data_finalizacao": payload["finished"],
        "ativo": True,
        "updated_at": now_iso(),
    }


def create_protocol(payload):
    created = supabase_request(
        "POST",
        PROTOCOLS_TABLE,
        payload=supabase_protocol_payload(payload),
        prefer="return=representation",
    )
    return created[0] if created else {}


def update_protocol(protocol_id, payload):
    rows = supabase_request(
        "PATCH",
        PROTOCOLS_TABLE,
        params={"id": f"eq.{protocol_id}"},
        payload=supabase_protocol_payload(payload),
        prefer="return=representation",
    )
    return rows[0] if rows else None


def delete_protocol(protocol_id):
    rows = supabase_request(
        "PATCH",
        PROTOCOLS_TABLE,
        params={"id": f"eq.{protocol_id}"},
        payload={"ativo": False, "updated_at": now_iso()},
        prefer="return=representation",
    )
    return bool(rows)


def query_history(protocolo_id=None):
    params = {"select": "*", "order": "data_consulta.desc", "limit": "200"}
    if protocolo_id:
        params["protocolo_id"] = f"eq.{protocolo_id}"
    return supabase_request("GET", HISTORY_TABLE, params=params) or []


def create_scrapy_job_stub():
    return {
        "ok": True,
        "mensagem": "Endpoint reservado para conectar o Scrapy depois.",
        "consultas": [],
    }


class Handler(BaseHTTPRequestHandler):
    def is_authenticated(self):
        return valid_session(self.headers.get("Cookie"))

    def log_message(self, format, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), format % args))

    def send_cors_headers(self):
        origin = self.headers.get("Origin")
        if origin and ("*" in CORS_ORIGINS or origin in CORS_ORIGINS):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Vary", "Origin")
        elif "*" in CORS_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def send_json(self, payload, status=HTTPStatus.OK):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_backend_error(self, error):
        self.send_json({"erro": str(error), "detalhes": error.details}, error.status)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def require_auth(self):
        if self.is_authenticated():
            return True
        self.send_json({"erro": "nao autenticado"}, HTTPStatus.UNAUTHORIZED)
        return False

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/health":
                return self.send_json(
                    {
                        "ok": True,
                        "backend": "supabase",
                        "supabaseConfigured": bool(SUPABASE_URL and SUPABASE_KEY),
                    }
                )
            if parsed.path == "/api/protocolos":
                if not self.require_auth():
                    return
                return self.send_json(query_protocols())
            if parsed.path == "/api/historico":
                if not self.require_auth():
                    return
                query = parse_qs(parsed.query)
                protocolo_id = query.get("protocolo_id", [None])[0]
                return self.send_json(query_history(protocolo_id))
            return self.send_json(
                {
                    "ok": True,
                    "service": "Hackatonbpk backend",
                    "message": "API online. Use as rotas /api/*.",
                }
            )
        except BackendError as error:
            return self.send_backend_error(error)

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/login":
                payload = self.read_json()
                email = clean(payload.get("email"))
                password = payload.get("password") or ""
                if email != APP_EMAIL or not hmac.compare_digest(password, APP_PASSWORD):
                    return self.send_json({"erro": "email ou senha invalidos"}, HTTPStatus.UNAUTHORIZED)
                token = make_session(email)
                same_site = "None; Secure" if os.environ.get("RENDER") else "Lax"
                self.send_response(HTTPStatus.OK)
                self.send_cors_headers()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Set-Cookie", f"bpk_session={token}; HttpOnly; SameSite={same_site}; Path=/")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
                return
            if parsed.path == "/api/logout":
                self.send_response(HTTPStatus.OK)
                self.send_cors_headers()
                self.send_header("Set-Cookie", "bpk_session=; Max-Age=0; Path=/")
                self.end_headers()
                return
            if not self.require_auth():
                return
            if parsed.path == "/api/protocolos":
                payload = protocol_from_payload(self.read_json())
                missing = [key for key in ("number", "organ", "responsible", "activity") if not payload[key]]
                if missing:
                    return self.send_json({"erro": f"campos obrigatorios ausentes: {', '.join(missing)}"}, HTTPStatus.BAD_REQUEST)
                created = create_protocol(payload)
                return self.send_json({"id": created.get("id")}, HTTPStatus.CREATED)
            if parsed.path == "/api/consultar":
                return self.send_json(create_scrapy_job_stub())
            return self.send_json({"erro": "rota nao encontrada"}, HTTPStatus.NOT_FOUND)
        except BackendError as error:
            return self.send_backend_error(error)

    def do_PUT(self):
        parsed = urlparse(self.path)
        if not self.require_auth():
            return
        match = re.match(r"^/api/protocolos/([^/]+)$", parsed.path)
        if not match:
            return self.send_json({"erro": "rota nao encontrada"}, HTTPStatus.NOT_FOUND)
        try:
            payload = protocol_from_payload(self.read_json())
            updated = update_protocol(match.group(1), payload)
            return self.send_json({"ok": bool(updated)})
        except BackendError as error:
            return self.send_backend_error(error)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if not self.require_auth():
            return
        match = re.match(r"^/api/protocolos/([^/]+)$", parsed.path)
        if not match:
            return self.send_json({"erro": "rota nao encontrada"}, HTTPStatus.NOT_FOUND)
        try:
            return self.send_json({"ok": delete_protocol(match.group(1)), "inativado": True})
        except BackendError as error:
            return self.send_backend_error(error)


def main():
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Backend Supabase rodando em http://{host}:{port}", flush=True)
    print(f"Supabase configurado: {bool(SUPABASE_URL and SUPABASE_KEY)}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)

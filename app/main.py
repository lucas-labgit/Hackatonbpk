import os
from http import HTTPStatus
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from server import (
    APP_EMAIL,
    APP_PASSWORD,
    CORS_ORIGINS,
    SUPABASE_KEY,
    SUPABASE_URL,
    BackendError,
    clean,
    create_protocol,
    create_scrapy_job_stub,
    delete_protocol,
    make_session,
    protocol_from_payload,
    query_history,
    query_protocols,
    update_protocol,
    valid_session,
)


app = FastAPI(title="Hackatonbpk Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def backend_error_response(error):
    raise HTTPException(
        status_code=int(error.status),
        detail={"erro": str(error), "detalhes": error.details},
    )


def require_auth(request):
    if valid_session(request.headers.get("Cookie")):
        return
    raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail={"erro": "nao autenticado"})


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "Hackatonbpk backend",
        "message": "API online. Use as rotas /api/*.",
    }


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "backend": "supabase",
        "supabaseConfigured": bool(SUPABASE_URL and SUPABASE_KEY),
    }


@app.post("/api/login")
async def login(request: Request, response: Response):
    payload = await request.json()
    email = clean(payload.get("email"))
    password = payload.get("password") or ""

    if email != APP_EMAIL or password != APP_PASSWORD:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail={"erro": "email ou senha invalidos"})

    same_site = "none" if os.environ.get("RENDER") else "lax"
    response.set_cookie(
        key="bpk_session",
        value=make_session(email),
        httponly=True,
        secure=bool(os.environ.get("RENDER")),
        samesite=same_site,
        path="/",
    )
    return {"ok": True}


@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie(key="bpk_session", path="/")
    return {"ok": True}


@app.get("/api/protocolos")
def list_protocols(request: Request):
    require_auth(request)
    try:
        return query_protocols()
    except BackendError as error:
        backend_error_response(error)


@app.post("/api/protocolos", status_code=HTTPStatus.CREATED)
async def add_protocol(request: Request):
    require_auth(request)
    payload = protocol_from_payload(await request.json())
    missing = [key for key in ("number", "organ", "responsible", "activity") if not payload[key]]
    if missing:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail={"erro": f"campos obrigatorios ausentes: {', '.join(missing)}"},
        )

    try:
        created = create_protocol(payload)
        return {"id": created.get("id")}
    except BackendError as error:
        backend_error_response(error)


@app.put("/api/protocolos/{protocol_id}")
async def edit_protocol(protocol_id: str, request: Request):
    require_auth(request)
    try:
        updated = update_protocol(protocol_id, protocol_from_payload(await request.json()))
        return {"ok": bool(updated)}
    except BackendError as error:
        backend_error_response(error)


@app.delete("/api/protocolos/{protocol_id}")
def remove_protocol(protocol_id: str, request: Request):
    require_auth(request)
    try:
        return {"ok": delete_protocol(protocol_id), "inativado": True}
    except BackendError as error:
        backend_error_response(error)


@app.get("/api/historico")
def history(request: Request, protocolo_id: Optional[str] = None):
    require_auth(request)
    try:
        return query_history(protocolo_id)
    except BackendError as error:
        backend_error_response(error)


@app.post("/api/consultar")
def consult(request: Request):
    require_auth(request)
    return create_scrapy_job_stub()

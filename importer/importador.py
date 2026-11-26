"""
Importador de dados em Python (sem n8n).

Puxa Google Ads, GA4, Google Search Console e Meta Ads dos clientes listados
em PYTHON_IMPORT_CLIENTS (padrao: Alphaz) e grava nas mesmas tabelas do
Supabase usadas pelos scripts Node, no mesmo formato.

Os IDs de cada cliente vem da tabela reports_config:
  google_ads_id, ga4_property_id, gsc_url, meta_ads_id
e as tabelas de destino tambem:
  ads_table_name, table_name (GA4), gsc_table_name, fb_ads_table_name

Uso:
  python importador.py --days 7          # roda uma vez (ultimos 7 dias)
  python importador.py --loop            # fica rodando, 1x por dia em RUN_AT_HOUR
  python importador.py --days 30 --only ga4,gsc

Variaveis de ambiente:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
  GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID
  META_ACCESS_TOKEN (opcional; sem ele o Meta e ignorado)
  PYTHON_IMPORT_CLIENTS (padrao "Alphaz"), IMPORT_DAYS (padrao 3),
  RUN_AT_HOUR (padrao 6, horario de Brasilia)
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import traceback
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote

import requests

BRT = timezone(timedelta(hours=-3))
HTTP_TIMEOUT = 120
UPSERT_BATCH = 500


# ---------------------------------------------------------------- utilidades

def log(msg: str) -> None:
    print(f"[{datetime.now(BRT):%Y-%m-%d %H:%M:%S}] {msg}", flush=True)


def env(name: str, default: str | None = None) -> str | None:
    val = os.environ.get(name)
    if val is None:
        return default
    val = val.strip().strip("'\"`").strip()
    return val or default


def load_dotenv(path: str) -> None:
    """Le um .env simples (para rodar localmente). Nao sobrescreve o ambiente."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip().strip("'\"`"))


def date_range(days: int) -> tuple[str, str]:
    """Mesmo periodo dos scripts Node: de (hoje - days) ate ontem."""
    today = datetime.now(BRT).date()
    start = today - timedelta(days=days)
    end = today - timedelta(days=1)
    return start.isoformat(), end.isoformat()


# ----------------------------------------------------------------- supabase

class Supabase:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        })

    def select(self, table: str, query: str = "select=*") -> list[dict]:
        r = self.session.get(f"{self.base}/{quote(table)}?{query}", timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        return r.json()

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> None:
        for i in range(0, len(rows), UPSERT_BATCH):
            chunk = rows[i:i + UPSERT_BATCH]
            r = self.session.post(
                f"{self.base}/{quote(table)}?on_conflict={on_conflict}",
                json=chunk,
                headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
                timeout=HTTP_TIMEOUT,
            )
            if r.status_code >= 300:
                raise RuntimeError(f"Supabase upsert {table}: {r.status_code} {r.text[:500]}")

    def delete_period(self, table: str, client_id: str, start: str, end: str) -> None:
        r = self.session.delete(
            f"{self.base}/{quote(table)}",
            params={
                "client_id": f"eq.{client_id}",
                "and": f"(metric_date.gte.{start},metric_date.lte.{end})",
            },
            headers={"Prefer": "return=minimal"},
            timeout=HTTP_TIMEOUT,
        )
        if r.status_code >= 300:
            raise RuntimeError(f"Supabase delete {table}: {r.status_code} {r.text[:500]}")

    def insert(self, table: str, rows: list[dict]) -> None:
        for i in range(0, len(rows), UPSERT_BATCH):
            r = self.session.post(
                f"{self.base}/{quote(table)}",
                json=rows[i:i + UPSERT_BATCH],
                headers={"Prefer": "return=minimal"},
                timeout=HTTP_TIMEOUT,
            )
            if r.status_code >= 300:
                raise RuntimeError(f"Supabase insert {table}: {r.status_code} {r.text[:500]}")


# ------------------------------------------------------------------ google

def google_access_token() -> str:
    r = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": env("GOOGLE_CLIENT_ID"),
            "client_secret": env("GOOGLE_CLIENT_SECRET"),
            "refresh_token": env("GOOGLE_REFRESH_TOKEN"),
            "grant_type": "refresh_token",
        },
        timeout=HTTP_TIMEOUT,
    )
    data = r.json()
    if r.status_code != 200 or "access_token" not in data:
        raise RuntimeError(f"Falha ao obter access token do Google: {data.get('error_description') or data}")
    return data["access_token"]


def import_google_ads(sb: Supabase, cfg: dict, token: str, start: str, end: str) -> int:
    customer_id = str(cfg.get("google_ads_id") or "").replace("-", "").strip()
    if not customer_id:
        log("   Google Ads: sem google_ads_id, pulando.")
        return 0
    table = cfg.get("ads_table_name") or "Dec_google_ads_metrics"
    login_id = (env("GOOGLE_ADS_LOGIN_CUSTOMER_ID") or "").replace("-", "")

    query = (
        "SELECT segments.date, campaign.id, campaign.name, campaign.status, "
        "metrics.impressions, metrics.clicks, metrics.cost_micros, "
        "metrics.conversions, metrics.conversions_value FROM campaign "
        f"WHERE segments.date BETWEEN '{start}' AND '{end}' AND campaign.status != 'REMOVED'"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN") or "",
        "Content-Type": "application/json",
    }
    if login_id:
        headers["login-customer-id"] = login_id

    r = requests.post(
        f"https://googleads.googleapis.com/v24/customers/{customer_id}/googleAds:searchStream",
        json={"query": query}, headers=headers, timeout=HTTP_TIMEOUT,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Google Ads {r.status_code}: {r.text[:800]}")

    rows = []
    for batch in r.json():
        for row in batch.get("results", []):
            m = row.get("metrics", {})
            c = row.get("campaign", {})
            rows.append({
                "client_id": cfg["id"],
                "metric_date": row.get("segments", {}).get("date"),
                "campaign_id": str(c.get("id", "")),
                "campaign_name": c.get("name") or "Sem nome",
                "impressions": int(m.get("impressions", 0) or 0),
                "clicks": int(m.get("clicks", 0) or 0),
                "cost": round(float(m.get("costMicros", 0) or 0) / 1_000_000, 2),
                "conversions": round(float(m.get("conversions", 0) or 0), 2),
                "conversions_value": round(float(m.get("conversionsValue", 0) or 0), 2),
            })
    if rows:
        sb.upsert(table, rows, "client_id,metric_date,campaign_id,campaign_name")
    log(f"   Google Ads: {len(rows)} linhas -> {table}")
    return len(rows)


def _ga4_report(token: str, prop: str, body: dict) -> list[dict]:
    """runReport com paginacao."""
    out, offset, limit = [], 0, 10000
    while True:
        payload = dict(body, limit=limit, offset=offset)
        r = requests.post(
            f"https://analyticsdata.googleapis.com/v1beta/properties/{prop}:runReport",
            json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=HTTP_TIMEOUT,
        )
        if r.status_code != 200:
            raise RuntimeError(f"GA4 {r.status_code}: {r.text[:800]}")
        data = r.json()
        rows = data.get("rows", [])
        out.extend(rows)
        offset += len(rows)
        if not rows or offset >= int(data.get("rowCount", 0)):
            return out


def _ga4_date(raw: str) -> str:
    return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"


def import_ga4(sb: Supabase, cfg: dict, token: str, start: str, end: str) -> int:
    prop = str(cfg.get("ga4_property_id") or "").strip()
    if not prop:
        log("   GA4: sem ga4_property_id, pulando.")
        return 0
    table = cfg.get("table_name")
    dr = [{"startDate": start, "endDate": end}]

    totals = _ga4_report(token, prop, {
        "dateRanges": dr,
        "dimensions": [{"name": "date"}],
        "metrics": [{"name": n} for n in (
            "sessions", "totalUsers", "activeUsers", "bounceRate", "screenPageViews",
            "engagementRate", "averageSessionDuration", "engagedSessions", "eventCount")],
    })
    rows = []
    for row in totals:
        v = [mv["value"] for mv in row["metricValues"]]
        rows.append({
            "client_id": cfg["id"],
            "metric_date": _ga4_date(row["dimensionValues"][0]["value"]),
            "page_path": "", "session_manual_source_medium": "", "session_source": "",
            "session_medium": "", "city": "", "device_category": "", "browser": "",
            "sessions": int(float(v[0])), "total_users": int(float(v[1])),
            "active_users": int(float(v[2])), "bounce_rate": float(v[3]),
            "page_views": int(float(v[4])), "engagement_rate": float(v[5]),
            "average_session_duration": float(v[6]), "engaged_sessions": int(float(v[7])),
            "events": int(float(v[8])), "total_ad_revenue": 0.0, "transactions": 0,
            "session_duration": 0.0,
        })
    n_totals = len(rows)

    details = _ga4_report(token, prop, {
        "dateRanges": dr,
        "dimensions": [{"name": n} for n in (
            "date", "pagePath", "sessionSource", "sessionMedium", "city", "deviceCategory", "browser")],
        "metrics": [{"name": "sessions"}, {"name": "totalUsers"}, {"name": "screenPageViews"}],
    })
    seen = set()
    for row in details:
        d = [dv.get("value") or "" for dv in row["dimensionValues"]]
        v = [mv["value"] for mv in row["metricValues"]]
        source, medium = d[2], d[3]
        rec = {
            "client_id": cfg["id"],
            "metric_date": _ga4_date(d[0]),
            "page_path": d[1],
            "session_manual_source_medium": f"{source} / {medium}" if source and medium else "",
            "session_source": source, "session_medium": medium,
            "city": d[4], "device_category": d[5], "browser": d[6],
            "sessions": int(float(v[0])), "total_users": int(float(v[1])),
            "page_views": int(float(v[2])), "active_users": 0, "bounce_rate": 0.0,
            "engagement_rate": 0.0, "average_session_duration": 0.0, "engaged_sessions": 0,
            "events": 0, "total_ad_revenue": 0.0, "transactions": 0, "session_duration": 0.0,
        }
        key = tuple(rec[k] for k in ("metric_date", "page_path", "session_manual_source_medium",
                                      "session_source", "session_medium", "city",
                                      "device_category", "browser"))
        if key in seen:  # evita conflito duplicado dentro do mesmo lote
            continue
        seen.add(key)
        rows.append(rec)

    if rows:
        sb.upsert(table, rows, "client_id,metric_date,page_path,session_manual_source_medium,"
                               "session_source,session_medium,city,device_category,browser")
    log(f"   GA4: {len(rows)} linhas ({n_totals} totais + {len(rows) - n_totals} detalhes) -> {table}")
    return len(rows)


def import_gsc(sb: Supabase, cfg: dict, token: str, start: str, end: str) -> int:
    site = str(cfg.get("gsc_url") or "").strip()
    if not site:
        log("   Search Console: sem gsc_url, pulando.")
        return 0
    table = cfg.get("gsc_table_name") or "Dec_google_search_console_metrics"
    url = f"https://www.googleapis.com/webmasters/v3/sites/{quote(site, safe='')}/searchAnalytics/query"

    rows, start_row, page = [], 0, 25000
    while True:
        r = requests.post(url, json={
            "startDate": start, "endDate": end,
            "dimensions": ["date", "query", "page", "device", "country"],
            "rowLimit": page, "startRow": start_row,
        }, headers={"Authorization": f"Bearer {token}"}, timeout=HTTP_TIMEOUT)
        if r.status_code != 200:
            raise RuntimeError(f"Search Console {r.status_code}: {r.text[:800]}")
        got = r.json().get("rows", [])
        for row in got:
            k = row.get("keys", [])
            rows.append({
                "client_id": cfg["id"],
                "metric_date": k[0] if len(k) > 0 else start,
                "query": (k[1] if len(k) > 1 else "") or "sem termo",
                "page": k[2] if len(k) > 2 else "",
                "device": (k[3] if len(k) > 3 else "DESKTOP").upper(),
                "country": (k[4] if len(k) > 4 else "BR").upper(),
                "clicks": int(row.get("clicks", 0)),
                "impressions": int(row.get("impressions", 0)),
                "position": round(float(row.get("position", 0)), 2),
            })
        if len(got) < page:
            break
        start_row += page

    if rows:
        sb.upsert(table, rows, "client_id,metric_date,query,page,device,country")
    log(f"   Search Console: {len(rows)} linhas -> {table}")
    return len(rows)


# -------------------------------------------------------------------- meta

CONV_TYPES = ("conversion", "lead", "complete_registration", "submit_form")


def import_meta(sb: Supabase, cfg: dict, start: str, end: str) -> int:
    account = str(cfg.get("meta_ads_id") or "").strip()
    token = env("META_ACCESS_TOKEN")
    if not account:
        log("   Meta Ads: sem meta_ads_id, pulando.")
        return 0
    if not token:
        log("   Meta Ads: META_ACCESS_TOKEN nao definido, pulando.")
        return 0
    if not account.startswith("act_"):
        account = f"act_{account}"
    table = cfg.get("fb_ads_table_name") or "Dec_facebook_ads_metrics"

    url = f"https://graph.facebook.com/v23.0/{account}/insights"
    params = {
        "access_token": token, "level": "campaign", "time_increment": "1",
        "fields": "campaign_id,campaign_name,impressions,clicks,spend,actions,action_values",
        "time_range": f'{{"since":"{start}","until":"{end}"}}', "limit": "1000",
    }
    rows = []
    while url:
        r = requests.get(url, params=params, timeout=HTTP_TIMEOUT)
        data = r.json()
        if r.status_code != 200 or "error" in data:
            raise RuntimeError(f"Meta Ads {r.status_code}: {str(data.get('error', data))[:800]}")
        for row in data.get("data", []):
            conv = sum(
                float(a.get("value", 0)) for a in row.get("actions", []) or []
                if (t := (a.get("action_type") or "").lower()) in ("purchase", "lead", "contact")
                or any(x in t for x in CONV_TYPES)
            )
            conv_val = sum(
                float(a.get("value", 0)) for a in row.get("action_values", []) or []
                if (t := (a.get("action_type") or "").lower()) == "purchase"
                or "conversion" in t or "value" in t
            )
            rows.append({
                "client_id": cfg["id"],
                "metric_date": row.get("date_start") or start,
                "campaign_id": str(row.get("campaign_id", "")),
                "campaign_name": row.get("campaign_name") or "Sem nome",
                "impressions": int(row.get("impressions", 0) or 0),
                "clicks": int(row.get("clicks", 0) or 0),
                "spend": round(float(row.get("spend", 0) or 0), 2),
                "conversions": round(conv, 2),
                "conversions_value": round(conv_val, 2),
            })
        url = data.get("paging", {}).get("next")
        params = None  # a URL "next" ja traz os parametros

    if rows:
        # Mesmo esquema do Node (apaga o periodo e insere), mas so deste cliente.
        sb.delete_period(table, cfg["id"], start, end)
        sb.insert(table, rows)
    log(f"   Meta Ads: {len(rows)} linhas -> {table}")
    return len(rows)


# -------------------------------------------------------------------- main

SOURCES = ("ads", "ga4", "gsc", "meta")


def run_once(days: int, only: set[str]) -> bool:
    sb = Supabase(env("SUPABASE_URL") or env("VITE_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"))
    names = [n.strip().lower() for n in (env("PYTHON_IMPORT_CLIENTS", "Alphaz") or "").split(",") if n.strip()]
    start, end = date_range(days)
    log(f"=== Importacao Python | periodo {start} a {end} ({days} dias) | clientes: {', '.join(names)} ===")

    configs = [c for c in sb.select("reports_config") if str(c.get("name", "")).lower() in names]
    if not configs:
        log("Nenhum cliente encontrado em reports_config com esses nomes.")
        return False

    token = None
    if only & {"ads", "ga4", "gsc"}:
        token = google_access_token()

    ok = True
    for cfg in configs:
        log(f"-> Cliente {cfg['name']}")
        steps = {
            "ads": lambda: import_google_ads(sb, cfg, token, start, end),
            "ga4": lambda: import_ga4(sb, cfg, token, start, end),
            "gsc": lambda: import_gsc(sb, cfg, token, start, end),
            "meta": lambda: import_meta(sb, cfg, start, end),
        }
        for name in SOURCES:
            if name not in only:
                continue
            try:
                steps[name]()
            except Exception as exc:  # um erro numa fonte nao para as outras
                ok = False
                log(f"   ERRO em {name}: {exc}")
    log("=== Fim ===")
    return ok


def run_loop(days: int, only: set[str]) -> None:
    hour = int(env("RUN_AT_HOUR", "6"))
    log(f"Modo continuo: roda agora e depois todo dia as {hour:02d}:00 (Brasilia).")
    last_run: date | None = None
    while True:
        now = datetime.now(BRT)
        if last_run is None or (now.date() != last_run and now.hour >= hour):
            try:
                run_once(days, only)
            except Exception:
                log("ERRO geral:\n" + traceback.format_exc())
            last_run = now.date()
        time.sleep(300)


def main() -> None:
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))
    p = argparse.ArgumentParser(description="Importador Python (sem n8n)")
    p.add_argument("--days", type=int, default=int(env("IMPORT_DAYS", "3")))
    p.add_argument("--loop", action="store_true", help="fica rodando 1x por dia")
    p.add_argument("--only", default=",".join(SOURCES), help="ads,ga4,gsc,meta")
    a = p.parse_args()
    only = {s.strip() for s in a.only.split(",") if s.strip() in SOURCES}

    missing = [k for k in ("SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_CLIENT_ID",
                           "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN") if not env(k)]
    if missing:
        log(f"Faltam variaveis de ambiente: {', '.join(missing)}")
        sys.exit(1)

    if a.loop:
        run_loop(a.days, only)
    else:
        sys.exit(0 if run_once(a.days, only) else 1)


if __name__ == "__main__":
    main()

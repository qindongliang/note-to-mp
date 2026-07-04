#!/usr/bin/env python3
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8787"))
PROXY_TOKEN = os.environ.get("PROXY_TOKEN", "")
WX_SECRETS_JSON = os.environ.get("WX_SECRETS_JSON", "")
WX_SECRETS_FILE = os.environ.get("WX_SECRETS_FILE", "")


def load_secret_map():
    if WX_SECRETS_JSON:
        return json.loads(WX_SECRETS_JSON)
    if WX_SECRETS_FILE:
        with open(WX_SECRETS_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    return {}


WX_SECRETS = load_secret_map()


def wx_token(appid, secret):
    query = urllib.parse.urlencode({
        "grant_type": "client_credential",
        "appid": appid,
        "secret": secret,
    })
    url = f"https://api.weixin.qq.com/cgi-bin/token?{query}"
    with urllib.request.urlopen(url, timeout=15) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def send_json(self, status, body):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-methods", "GET,POST,OPTIONS")
        self.send_header("access-control-allow-headers", "content-type,x-proxy-token")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/health":
            self.send_json(200, {"ok": True})
            return
        self.send_json(404, {"errcode": 404, "errmsg": "not found"})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/token":
            self.send_json(404, {"errcode": 404, "errmsg": "not found"})
            return

        if PROXY_TOKEN:
            params = urllib.parse.parse_qs(parsed.query)
            token = self.headers.get("x-proxy-token", "") or params.get("token", [""])[0]
            if token != PROXY_TOKEN:
                self.send_json(401, {"errcode": 401, "errmsg": "invalid proxy token"})
                return

        try:
            length = int(self.headers.get("content-length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            appid = body.get("appid")
            secret = WX_SECRETS.get(appid) or body.get("secret")
            if not appid or not secret:
                self.send_json(400, {"errcode": 400, "errmsg": "appid and secret are required"})
                return

            status, data = wx_token(appid, secret)
            self.send_json(status, data)
        except urllib.error.HTTPError as error:
            try:
                data = json.loads(error.read().decode("utf-8"))
            except Exception:
                data = {"errcode": error.code, "errmsg": str(error)}
            self.send_json(error.code, data)
        except Exception as error:
            self.send_json(500, {"errcode": 500, "errmsg": str(error)})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"wechat token proxy listening on http://{HOST}:{PORT}", flush=True)
    server.serve_forever()

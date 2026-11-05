import http.server
import socketserver
import urllib.request
import urllib.error
import os

PORT = 8082
ADMIN_DIR = os.path.dirname(os.path.abspath(__file__))
PB_API = 'http://localhost:8090'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ADMIN_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:8082')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy('GET')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy('POST')
        else:
            self.send_error(404)

    def do_PATCH(self):
        if self.path.startswith('/api/'):
            self._proxy('PATCH')
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self._proxy('DELETE')
        else:
            self.send_error(404)

    def _proxy(self, method):
        url = PB_API + self.path
        body = None
        if method in ('POST', 'PATCH'):
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)

        req = urllib.request.Request(url, data=body, method=method)
        # forward all relevant headers (Authorization, Content-Type, Cookie)
        for h in ('Authorization', 'Content-Type', 'Cookie'):
            v = self.headers.get(h)
            if v:
                req.add_header(h, v)

        try:
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() in ('set-cookie',):
                        self.send_header(k, v)
                self.send_header('Access-Control-Allow-Origin', 'http://localhost:8082')
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() in ('set-cookie',):
                    self.send_header(k, v)
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:8082')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Content-Type', e.headers.get('Content-Type', 'application/json'))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:8082')
            self.end_headers()
            self.wfile.write(str(e).encode())


socketserver.TCPServer.allow_reuse_address = True
if __name__ == '__main__':
    with socketserver.TCPServer(('0.0.0.0', PORT), Handler) as httpd:
        print(f'Serving admin panel + API proxy on http://localhost:{PORT}')
        httpd.serve_forever()

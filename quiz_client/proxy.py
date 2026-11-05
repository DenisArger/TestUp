import http.server, socketserver, urllib.request, urllib.error, os
PORT = 8083
CLIENT_DIR = os.path.dirname(os.path.abspath(__file__))
PB_API = 'http://localhost:8090'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=CLIENT_DIR, **kwargs)
    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy('GET')
        else:
            super().do_GET()
    def do_POST(self):
        if self.path.startswith('/api/'): self._proxy('POST')
        else: self.send_error(404)
    def do_PATCH(self):
        if self.path.startswith('/api/'): self._proxy('PATCH')
        else: self.send_error(404)
    def do_DELETE(self):
        if self.path.startswith('/api/'): self._proxy('DELETE')
        else: self.send_error(404)
    def _proxy(self, method):
        url = PB_API + self.path
        body=None
        if method in ('POST','PATCH'):
            length=int(self.headers.get('Content-Length',0)); body=self.rfile.read(length)
        req=urllib.request.Request(url,data=body,method=method)
        for h in ('Authorization','Content-Type','Cookie'):
            v=self.headers.get(h)
            if v: req.add_header(h,v)
        try:
            with urllib.request.urlopen(req) as resp:
                data=resp.read()
                self.send_response(resp.status)
                self.send_header('Content-Type', resp.headers.get('Content-Type','application/json'))
                self.end_headers(); self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data=e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', e.headers.get('Content-Type','application/json'))
            self.end_headers(); self.wfile.write(data)
        except Exception as e:
            self.send_response(502); self.end_headers(); self.wfile.write(str(e).encode())

socketserver.TCPServer.allow_reuse_address=True
if __name__=='__main__':
    with socketserver.TCPServer(('0.0.0.0',PORT),Handler) as httpd:
        print(f'Serving quiz client + API proxy on http://localhost:{PORT}')
        httpd.serve_forever()

#!/usr/bin/env python3
"""Serve Firebase-style SPA routes while keeping missing assets as 404."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import re


class StaticSpaHandler(SimpleHTTPRequestHandler):
    """Bat chuoc dung rewrite "**" -> "/index.html" cua Firebase Hosting.

    Duong dan nao khong tro toi mot tep co that thi tra ve index.html, tru cac
    duong dan tai san (/assets/...) - thieu tai san thi phai thay 404 chu khong
    phai trang HTML, neu khong loi vantay sai se im lang khong ai biet.
    """

    tai_san = re.compile(r"^/assets/")

    def send_head(self):
        path = urlsplit(self.path).path
        candidate = Path(self.translate_path(path))
        if not candidate.is_file() and not self.tai_san.match(path):
            self.path = "/index.html"
        return super().send_head()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", default=".")
    parser.add_argument("--bind", default="0.0.0.0")
    parser.add_argument("port", type=int, nargs="?", default=3000)
    args = parser.parse_args()

    handler = lambda *handler_args, **handler_kwargs: StaticSpaHandler(
        *handler_args, directory=args.directory, **handler_kwargs
    )
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    print(f"Serving SPA static files from {Path(args.directory).resolve()} on {args.bind}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
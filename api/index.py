"""
Entrypoint da função serverless da Vercel.

A Vercel detecta qualquer arquivo dentro de /api como uma função. Este
arquivo só importa o app FastAPI de verdade (que mora em backend/app/main.py)
e expõe como `app` — a Vercel reconhece automaticamente uma app ASGI
(FastAPI/Starlette) exportada dessa forma.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402

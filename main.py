import struct
import pyautogui
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from starlette.staticfiles import StaticFiles

app = FastAPI()
app.mount("/static", StaticFiles(directory="templates/site-info"), name="static")
templates = Jinja2Templates(directory="templates/site-info")

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
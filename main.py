from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi import Request
from starlette.staticfiles import StaticFiles

app = FastAPI()
app.mount("/static", StaticFiles(directory="static/"), name="static")
templates = Jinja2Templates(directory="templates/")

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
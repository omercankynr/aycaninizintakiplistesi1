# backend/server.py

from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ----------------------------
# Logging
# ----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ayca-izin-api")

# ----------------------------
# App
# ----------------------------
app = FastAPI(
    title="Ayça İzin Takip API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

@app.get("/")
def root():
    return {"status": "API ayakta"}

# ----------------------------
# MongoDB
# ----------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ----------------------------
# CORS (FIXED)
# ----------------------------
# IMPORTANT:
# - allow_credentials=True iken allow_origins="*" kullanma.
# - Render frontend domain(ler)ini açıkça allowlist'e yaz.
default_allowed_origins = [
    # Frontend (Static Site) domainin
    "https://aycaninizintakiplistesi1-1.onrender.com",
    # Eğer bazen aynı domain üzerinden de frontend açılıyorsa diye (opsiyonel)
    "https://aycaninizintakiplistesi1.onrender.com",
    # Local dev
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

env_origins = os.getenv("CORS_ORIGINS", "").strip()
if env_origins:
    # Virgülle ayrılmış liste: "https://a.com,https://b.com"
    allowed_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
else:
    allowed_origins = default_allowed_origins

logger.info(f"CORS allowed_origins = {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Router
# ----------------------------
api_router = APIRouter(prefix="/api")

@api_router.get("/ping")
def ping():
    return {"pong": True}

# Default colors for employees
DEFAULT_COLORS = [
    "#E91E63", "#2196F3", "#FF5722", "#9C27B0", "#00BCD4", "#4CAF50",
    "#CDDC39", "#FF9800", "#795548", "#607D8B", "#F44336", "#673AB7",
    "#3F51B5", "#009688", "#8BC34A", "#FFC107", "#FF5252", "#7C4DFF"
]

# Default employees
DEFAULT_EMPLOYEES = [
    {"id": "ayca_cisem", "name": "AYÇA ÇİSEM ÇOBAN", "short_name": "AYÇA Ç.", "position": "TL", "color": "#E91E63"},
    {"id": "enis", "name": "ENİS USLU", "short_name": "ENİS U.", "position": "TL", "color": "#2196F3"},
    {"id": "onur", "name": "ONUR KARAGÜLER", "short_name": "ONUR K.", "position": "TL", "color": "#FF5722"},
    {"id": "busra", "name": "BÜŞRA PARILTI", "short_name": "BÜŞRA P.", "position": "Agent", "color": "#9C27B0"},
    {"id": "sila", "name": "SILA USTA", "short_name": "SILA U.", "position": "Agent", "color": "#00BCD4"},
    {"id": "nergiz", "name": "NERGİZ OZĞAN", "short_name": "NERGİZ O.", "position": "Agent", "color": "#4CAF50"},
    {"id": "aysun", "name": "AYSUN KUL", "short_name": "AYSUN K.", "position": "Agent", "color": "#CDDC39"},
    {"id": "elif", "name": "ELİF ERKAN", "short_name": "ELİF E.", "position": "Agent", "color": "#FF9800"},
    {"id": "ebru", "name": "EBRU FİDAN", "short_name": "EBRU F.", "position": "Agent", "color": "#795548"},
    {"id": "ayca_demir", "name": "AYÇA DEMİR", "short_name": "AYÇA D.", "position": "Agent", "color": "#607D8B"},
    {"id": "kader", "name": "KADER MÜREN", "short_name": "KADER M.", "position": "Agent", "color": "#F44336"},
    {"id": "rabia", "name": "RABİA BATUK", "short_name": "RABİA B.", "position": "Agent", "color": "#673AB7"},
]

# ----------------------------
# Models
# ----------------------------
class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    short_name: str
    position: str = "Agent"  # TL or Agent
    work_type: str = "Office"  # Office or HomeOffice
    color: str = "#607D8B"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    name: str
    short_name: str
    position: str = "Agent"
    work_type: str = "Office"
    color: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    position: Optional[str] = None
    work_type: Optional[str] = None
    color: Optional[str] = None

class LeaveEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    date: str
    week_start: str
    slot: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeaveEntryCreate(BaseModel):
    employee_id: str
    date: str
    week_start: str
    slot: int

class OvertimeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    date: str
    hours: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OvertimeEntryCreate(BaseModel):
    employee_id: str
    date: str
    hours: float

class LeaveTypeEnum(str, Enum):
    UNPAID = "unpaid"
    ANNUAL = "annual"
    COMPENSATORY = "compensatory"

class LeaveTypeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    date: str
    leave_type: LeaveTypeEnum
    hours: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeaveTypeEntryCreate(BaseModel):
    employee_id: str
    date: str
    leave_type: LeaveTypeEnum
    hours: Optional[float] = None

# ----------------------------
# Startup seed
# ----------------------------
@app.on_event("startup")
async def startup_event():
    count = await db.employees.count_documents({})
    if count == 0:
        for emp in DEFAULT_EMPLOYEES:
            emp_obj = Employee(**emp)
            doc = emp_obj.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.employees.insert_one(doc)
        logger.info("Seeded default employees")

# ----------------------------
# Endpoints
# ----------------------------
@api_router.get("/")
async def api_root():
    return {"message": "İzin Yönetim Sistemi API"}

@api_router.get("/employees")
async def get_employees():
    return await db.employees.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/employees", response_model=Employee)
async def create_employee(input: EmployeeCreate):
    if not input.color:
        count = await db.employees.count_documents({})
        input.color = DEFAULT_COLORS[count % len(DEFAULT_COLORS)]

    emp_obj = Employee(**input.model_dump())
    doc = emp_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.employees.insert_one(doc)
    return emp_obj

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, input: EmployeeUpdate):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek alan belirtilmedi")

    result = await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Temsilci bulunamadı")

    return await db.employees.find_one({"id": employee_id}, {"_id": 0})

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str):
    leave_count = await db.leaves.count_documents({"employee_id": employee_id})
    if leave_count > 0:
        raise HTTPException(status_code=400, detail="Bu temsilcinin izin kayıtları var. Önce izinleri silin.")

    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Temsilci bulunamadı")

    return {"message": "Temsilci silindi"}

@api_router.post("/leaves", response_model=LeaveEntry)
async def create_leave_entry(input: LeaveEntryCreate):
    employee = await db.employees.find_one({"id": input.employee_id})
    if not employee:
        raise HTTPException(status_code=400, detail="Geçersiz çalışan ID")

    today = datetime.now().strftime("%Y-%m-%d")
    if input.date == today:
        raise HTTPException(status_code=400, detail="Bugün için izin kullanımı yasaktır")

    if input.employee_id in ["rabia", "ayca_demir"]:
        other_id = "ayca_demir" if input.employee_id == "rabia" else "rabia"
        existing = await db.leaves.find_one({"employee_id": other_id, "date": input.date})
        if existing:
            raise HTTPException(status_code=400, detail="Rabia Batuk ve Ayça Demir aynı gün izinli olamaz")

    existing_slots = await db.leaves.count_documents({"date": input.date})
    ayca_cisem_leave = await db.leaves.find_one({"employee_id": "ayca_cisem", "date": input.date})
    max_slots = 3 if ayca_cisem_leave else 7

    if existing_slots >= max_slots:
        raise HTTPException(status_code=400, detail=f"Bu gün için maksimum izin sayısına ({max_slots}) ulaşıldı")

    existing_leave = await db.leaves.find_one({"employee_id": input.employee_id, "date": input.date})
    if existing_leave:
        raise HTTPException(status_code=400, detail="Bu çalışan bu tarihte zaten izinli")

    leave_obj = LeaveEntry(**input.model_dump())
    doc = leave_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leaves.insert_one(doc)
    return leave_obj

@api_router.get("/leaves")
async def get_leaves(week_start: Optional[str] = None):
    query = {"week_start": week_start} if week_start else {}
    return await db.leaves.find(query, {"_id": 0}).to_list(1000)

@api_router.delete("/leaves/{leave_id}")
async def delete_leave(leave_id: str):
    result = await db.leaves.delete_one({"id": leave_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İzin kaydı bulunamadı")
    return {"message": "İzin silindi"}

@api_router.post("/overtime", response_model=OvertimeEntry)
async def create_overtime_entry(input: OvertimeEntryCreate):
    employee = await db.employees.find_one({"id": input.employee_id})
    if not employee:
        raise HTTPException(status_code=400, detail="Geçersiz çalışan ID")

    overtime_obj = OvertimeEntry(**input.model_dump())
    doc = overtime_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.overtime.insert_one(doc)
    return overtime_obj

@api_router.get("/overtime")
async def get_overtime():
    return await db.overtime.find({}, {"_id": 0}).to_list(1000)

@api_router.delete("/overtime/{overtime_id}")
async def delete_overtime(overtime_id: str):
    result = await db.overtime.delete_one({"id": overtime_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fazla çalışma kaydı bulunamadı")
    return {"message": "Fazla çalışma silindi"}

@api_router.post("/leave-types", response_model=LeaveTypeEntry)
async def create_leave_type_entry(input: LeaveTypeEntryCreate):
    employee = await db.employees.find_one({"id": input.employee_id})
    if not employee:
        raise HTTPException(status_code=400, detail="Geçersiz çalışan ID")

    if input.leave_type == LeaveTypeEnum.COMPENSATORY and not input.hours:
        raise HTTPException(status_code=400, detail="Telafi izni için saat belirtilmeli")

    leave_type_obj = LeaveTypeEntry(**input.model_dump())
    doc = leave_type_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leave_types.insert_one(doc)
    return leave_type_obj

@api_router.get("/leave-types")
async def get_leave_types():
    return await db.leave_types.find({}, {"_id": 0}).to_list(1000)

@api_router.delete("/leave-types/{leave_type_id}")
async def delete_leave_type(leave_type_id: str):
    result = await db.leave_types.delete_one({"id": leave_type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İzin türü kaydı bulunamadı")
    return {"message": "İzin türü silindi"}

# Register router
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import json
import os
import random
import subprocess
from datetime import datetime, timedelta, timezone
from functools import wraps
from time import perf_counter
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from bson import ObjectId
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
try:
    from backend.grouping import random_grouping, round_robin_grouping, genetic_grouping, metrics_for_groups
except ModuleNotFoundError:
    from grouping import random_grouping, round_robin_grouping, genetic_grouping, metrics_for_groups

# Load .env from the backend directory
load_dotenv(Path(__file__).resolve().parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "student_group_db")

if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI in environment")

client = MongoClient(MONGODB_URI)
db = client[MONGO_DB_NAME]
users = db["users"]
tests = db["tests"]
groups = db["groups"]
users.create_index("email", unique=True)

app = FastAPI(title="Student Group Formation API")

# Read allowed origins from environment variable (comma-separated).
# Example: CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
_cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()] if _cors_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


def oid(value: Any) -> Optional[ObjectId]:
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def doc_to_json(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(doc)
    out["id"] = str(out["_id"])
    del out["_id"]
    return out


def sanitize_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = doc_to_json(doc)
    out.pop("password", None)
    if out.get("groupId") is not None:
        out["groupId"] = str(out["groupId"])
    return out


def create_token(user: Dict[str, Any]) -> str:
    payload = {
        "id": str(user["_id"]),
        "role": user["role"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def get_current_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = users.find_one({"_id": oid(payload.get("id"))})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


from fastapi import Depends

def get_admin_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = get_current_user(authorization)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def execute_js(code: str, input_data: str) -> str:
    node_script = r"""
const userCode = process.argv[1] || '';
const input = process.argv[2] || '';
let output = '';
const lines = input.split('\n');
let idx = 0;
global.prompt = () => lines[idx++] || '';
global.console = { log: (...args) => { output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; } };
try {
  eval(userCode);
  process.stdout.write(output.trim());
} catch (err) {
  process.stderr.write(String(err && err.message ? err.message : err));
  process.exit(1);
}
"""
    try:
        result = subprocess.run(
            ["node", "-e", node_script, code, input_data],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "Code execution failed")
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        raise RuntimeError("Execution timed out")


def calculate_group_fitness(group_members: List[Dict[str, Any]]) -> float:
    if not group_members:
        return 0.0
    # CGPA balance (higher is better with low within-group variance)
    cgpas = [float(m.get("cgpa") or 0) for m in group_members]
    avg = sum(cgpas) / len(cgpas)
    variance = sum((x - avg) ** 2 for x in cgpas) / len(cgpas)
    cgpa_score = 1.0 / (variance + 0.1)

    # Tier balance: require all three tiers, penalize dominance
    excellent = sum(1 for m in group_members if m.get("tier") == "Excellent")
    good = sum(1 for m in group_members if m.get("tier") == "Good")
    low = sum(1 for m in group_members if m.get("tier") == "Low")
    tier_score = 0.0
    tier_score += 8.0 if excellent >= 1 else -8.0
    tier_score += 8.0 if good >= 1 else -8.0
    tier_score += 8.0 if low >= 1 else -8.0
    if max(excellent, good, low) > max(1, len(group_members) / 2):
        tier_score -= 10.0

    # Diversity: department and gender
    genders = len(set((m.get("gender") or "Unknown") for m in group_members))
    departments = len(set((m.get("department") or "Unknown") for m in group_members))
    diversity_score = genders * 5.0 + departments * 5.0

    return cgpa_score * 10.0 + tier_score + diversity_score


def _groups_from_chromosome(chromosome: List[List[int]], students_data: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    return [[students_data[i] for i in grp] for grp in chromosome]


def _chromosome_fitness(chromosome: List[List[int]], students_data: List[Dict[str, Any]], target_sizes: List[int]) -> float:
    total = 0.0
    group_means = []
    size_penalty = 0.0

    for idx, group in enumerate(chromosome):
        members = [students_data[i] for i in group]
        if not members:
            size_penalty -= 20.0
            continue

        # group member weights
        total += calculate_group_fitness(members)

        cgpas = [float(m.get("cgpa") or 0) for m in members]
        group_means.append(sum(cgpas) / len(cgpas))

        # equal size enforcement
        size_gap = abs(len(group) - target_sizes[idx])
        size_penalty -= size_gap * 15.0

    # between-group CGPA mean variance and penalties for imbalance
    if len(group_means) > 1:
        mean_of_means = sum(group_means) / len(group_means)
        mean_variance = sum((x - mean_of_means) ** 2 for x in group_means) / len(group_means)
        total += 50.0 / (mean_variance + 1.0)
    else:
        total += 5.0

    total += size_penalty
    return total


def _make_random_chromosome(num_students: int, target_sizes: List[int]) -> List[List[int]]:
    ids = list(range(num_students))
    random.shuffle(ids)
    chromosome: List[List[int]] = []
    idx = 0
    for size in target_sizes:
        chromosome.append(ids[idx : idx + size])
        idx += size
    return chromosome


def _crossover(parent1: List[List[int]], parent2: List[List[int]], target_sizes: List[int]) -> List[List[int]]:
    num_groups = len(parent1)
    chosen = set(random.sample(range(num_groups), k=max(1, num_groups // 2)))
    child: List[List[int]] = [list(parent1[g]) if g in chosen else [] for g in range(num_groups)]
    assigned = {student for g in chosen for student in parent1[g]}
    remaining = [student for group in parent2 for student in group if student not in assigned]

    for g in range(num_groups):
        if g in chosen:
            continue
        size = target_sizes[g]
        child[g] = remaining[:size]
        assigned.update(child[g])
        remaining = remaining[size:]

    # Fill any empty buckets if rounding issues happen
    for g in range(num_groups):
        while len(child[g]) < target_sizes[g] and remaining:
            child[g].append(remaining.pop(0))
    return child


def _mutate(chromosome: List[List[int]]) -> None:
    num_groups = len(chromosome)
    if num_groups < 2:
        return
    g1, g2 = random.sample(range(num_groups), 2)
    if not chromosome[g1] or not chromosome[g2]:
        return
    i1 = random.randrange(len(chromosome[g1]))
    i2 = random.randrange(len(chromosome[g2]))
    chromosome[g1][i1], chromosome[g2][i2] = chromosome[g2][i2], chromosome[g1][i1]


def run_grouping(students_data: List[Dict[str, Any]], group_size: int) -> List[List[Dict[str, Any]]]:
    n_students = len(students_data)
    if n_students == 0:
        return []
    if group_size <= 0:
        group_size = max(1, n_students)

    num_groups = max(1, (n_students + group_size - 1) // group_size)
    base_size = n_students // num_groups
    overflow = n_students % num_groups
    target_sizes = [base_size + (1 if i < overflow else 0) for i in range(num_groups)]

    # GA parameters
    population_size = 60
    generations = 120
    mutation_rate = 0.25
    elitism = 0.1

    population = [_make_random_chromosome(n_students, target_sizes) for _ in range(population_size)]

    for _ in range(generations):
        scored = [(chrom, _chromosome_fitness(chrom, students_data, target_sizes)) for chrom in population]
        scored.sort(key=lambda item: item[1], reverse=True)
        elite_count = max(2, int(population_size * elitism))
        next_gen = [chrom for chrom, _ in scored[:elite_count]]

        while len(next_gen) < population_size:
            parent1 = random.choice(scored[: population_size // 2])[0]
            parent2 = random.choice(scored[: population_size // 2])[0]
            child = _crossover(parent1, parent2, target_sizes)
            if random.random() < mutation_rate:
                _mutate(child)
            next_gen.append(child)

        population = next_gen

    best_chromosome = max(population, key=lambda c: _chromosome_fitness(c, students_data, target_sizes))
    optimized_groups = _groups_from_chromosome(best_chromosome, students_data)

    # fallback: if GA fails to produce a valid solution, do simple initial grouping
    if any(abs(len(g) - target_sizes[i]) > 1 for i, g in enumerate(optimized_groups)):
        students_copy = students_data[:]
        random.shuffle(students_copy)
        groups_out = [[] for _ in range(num_groups)]
        for i, student in enumerate(students_copy):
            groups_out[i % num_groups].append(student)
        return groups_out

    return optimized_groups


def seed_defaults() -> None:
    if not users.find_one({"role": "admin"}):
        users.insert_one(
            {
                "name": "System Admin",
                "email": "susindranad@gmail.com",
                "password": bcrypt.hashpw("susindran123".encode(), bcrypt.gensalt()).decode(),
                "role": "admin",
                "cgpa": None,
                "department": None,
                "gender": None,
                "testScore": 0,
                "tier": "Pending",
                "testStatus": "Pending",
                "groupId": None,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }
        )
    if not tests.find_one({}):
        tests.insert_one(
            {
                "title": "Initial Skill Assessment",
                "content": {
                    "mcqs": [
                        {"id": 1, "question": "What is the time complexity of binary search?", "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"], "correctAnswer": "O(log n)", "marks": 1},
                        {"id": 2, "question": "Which data structure uses LIFO?", "options": ["Queue", "Stack", "Linked List", "Tree"], "correctAnswer": "Stack", "marks": 1},
                        {"id": 3, "question": "What does SQL stand for?", "options": ["Structured Query Language", "Simple Query Language", "Strong Query Language", "Sequential Query Language"], "correctAnswer": "Structured Query Language", "marks": 1},
                        {"id": 4, "question": "Which of these is NOT a primitive data type in JavaScript?", "options": ["String", "Number", "Boolean", "Object"], "correctAnswer": "Object", "marks": 1},
                        {"id": 5, "question": "What is the purpose of 'git clone'?", "options": ["To create a new branch", "To copy a repository", "To delete a repository", "To merge branches"], "correctAnswer": "To copy a repository", "marks": 1},
                        {"id": 6, "question": "Which sorting algorithm has the best average case time complexity?", "options": ["Bubble Sort", "Quick Sort", "Insertion Sort", "Selection Sort"], "correctAnswer": "Quick Sort", "marks": 1},
                        {"id": 7, "question": "What does 'DOM' stand for in web development?", "options": ["Document Object Model", "Data Object Model", "Dynamic Object Model", "Document Oriented Model"], "correctAnswer": "Document Object Model", "marks": 1},
                        {"id": 8, "question": "Which HTTP method is used to retrieve data from a server?", "options": ["POST", "PUT", "GET", "DELETE"], "correctAnswer": "GET", "marks": 1},
                        {"id": 9, "question": "What is the output of 'console.log(typeof null)' in JavaScript?", "options": ["null", "undefined", "object", "boolean"], "correctAnswer": "object", "marks": 1},
                        {"id": 10, "question": "Which of the following is NOT a valid CSS selector?", "options": [".class", "#id", "*element", "@media"], "correctAnswer": "@media", "marks": 1},
                    ],
                    "coding": [
                        {"id": 1, "question": "Get two values from users and add them and store it in third variable and print the value of sum", "testCases": [{"input": "5\n3", "expectedOutput": "8"}, {"input": "10\n15", "expectedOutput": "25"}, {"input": "-2\n7", "expectedOutput": "5"}], "marks": 5},
                        {"id": 2, "question": "Get two values from users and sub them and store it in third variable and print the value of sum", "testCases": [{"input": "10\n3", "expectedOutput": "7"}, {"input": "5\n8", "expectedOutput": "-3"}, {"input": "0\n0", "expectedOutput": "0"}], "marks": 5},
                    ],
                },
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }
        )


seed_defaults()


class LoginPayload(BaseModel):
    email: str
    password: str


class SignupPayload(BaseModel):
    name: str
    email: str
    password: str


@app.post("/api/auth/login")
async def login(payload: LoginPayload):
    user = users.find_one({"email": payload.email.lower()})
    if not user or not bcrypt.checkpw(payload.password.encode(), str(user["password"]).encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(user), "user": sanitize_user(user)}


@app.post("/api/auth/signup")
async def signup(payload: SignupPayload):
    try:
        users.insert_one(
            {
                "name": payload.name,
                "email": payload.email.lower(),
                "password": bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(),
                "role": "admin",
                "cgpa": None,
                "department": None,
                "gender": None,
                "testScore": 0,
                "tier": "Pending",
                "testStatus": "Pending",
                "groupId": None,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }
        )
        return {"success": True}
    except Exception:
        raise HTTPException(status_code=400, detail="Email already exists")


@app.post("/api/admin/students")
async def add_student(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_admin_user)):
    try:
        users.insert_one(
            {
                "name": body.get("name"),
                "email": str(body.get("email", "")).lower(),
                "password": bcrypt.hashpw(str(body.get("password", "password123")).encode(), bcrypt.gensalt()).decode(),
                "role": "student",
                "cgpa": float(body.get("cgpa")) if body.get("cgpa") is not None else None,
                "department": body.get("department"),
                "gender": body.get("gender"),
                "testScore": 0,
                "tier": "Pending",
                "testStatus": "Pending",
                "groupId": None,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }
        )
        return {"success": True}
    except Exception:
        raise HTTPException(status_code=400, detail="Email already exists")


@app.get("/api/admin/students")
async def get_students(current_user: Dict[str, Any] = Depends(get_admin_user)):
    return [sanitize_user(d) for d in users.find({"role": "student"}).sort("createdAt", -1)]


@app.put("/api/admin/students/{student_id}")
async def update_student(student_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_admin_user)):
    student_oid = oid(student_id)
    if not student_oid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    patch: Dict[str, Any] = {
        "name": body.get("name"),
        "email": str(body.get("email", "")).lower(),
        "cgpa": float(body.get("cgpa")) if body.get("cgpa") is not None else None,
        "department": body.get("department"),
        "gender": body.get("gender"),
        "updatedAt": datetime.now(timezone.utc),
    }
    if body.get("password"):
        patch["password"] = bcrypt.hashpw(str(body.get("password")).encode(), bcrypt.gensalt()).decode()
    users.update_one({"_id": student_oid}, {"$set": patch})
    return {"success": True}


@app.post("/api/admin/students/{student_id}/assign-retest")
async def assign_retest(student_id: str, current_user: Dict[str, Any] = Depends(get_admin_user)):
    student_oid = oid(student_id)
    if not student_oid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    users.update_one({"_id": student_oid}, {"$set": {"testStatus": "Pending", "testScore": 0, "tier": "Pending"}})
    return {"success": True}


@app.delete("/api/admin/students/{student_id}")
async def delete_student(student_id: str, current_user: Dict[str, Any] = Depends(get_admin_user)):
    student_oid = oid(student_id)
    if not student_oid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    student = users.find_one({"_id": student_oid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.get("groupId"):
        g = groups.find_one({"_id": student["groupId"]})
        if g:
            member_ids = [m for m in g.get("members", []) if str(m) != str(student_oid)]
            if member_ids:
                groups.update_one({"_id": g["_id"]}, {"$set": {"members": member_ids}})
            else:
                groups.delete_one({"_id": g["_id"]})
    users.delete_one({"_id": student_oid})
    return {"success": True}


@app.get("/api/admin/test")
async def get_test(authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    test_doc = tests.find_one(sort=[("createdAt", 1)])
    return doc_to_json(test_doc) if test_doc else None


@app.post("/api/execute-code")
async def execute_code(body: Dict[str, Any], authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    code = str(body.get("code", ""))
    input_data = str(body.get("input", ""))
    try:
        return {"success": True, "result": execute_js(code, input_data)}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@app.post("/api/run-test-cases")
async def run_test_cases(body: Dict[str, Any], authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    code = str(body.get("code", ""))
    test_cases = body.get("testCases", [])
    results = []
    passed_count = 0
    for tc in test_cases:
        try:
            actual = execute_js(code, str(tc.get("input", ""))).strip()
            expected = str(tc.get("expectedOutput", "")).strip()
            passed = actual == expected
            if passed:
                passed_count += 1
            results.append({"input": tc.get("input", ""), "expected": expected, "actual": actual, "passed": passed})
        except Exception as exc:
            results.append({"input": tc.get("input", ""), "expected": tc.get("expectedOutput", ""), "actual": "", "passed": False, "error": str(exc)})
    return {"success": True, "results": results, "passedCount": passed_count, "totalCount": len(test_cases), "score": passed_count * 5}


@app.get("/api/student/profile")
async def student_profile(authorization: Optional[str] = Header(default=None)):
    return sanitize_user(get_current_user(authorization))


@app.post("/api/student/submit-test")
async def submit_test(body: Dict[str, Any], authorization: Optional[str] = Header(default=None)):
    user = get_current_user(authorization)
    score = int(body.get("score", 0))
    tier = "Low"
    if score >= 30:
        tier = "Excellent"
    elif score >= 20:
        tier = "Good"
    users.update_one({"_id": user["_id"]}, {"$set": {"testScore": score, "testStatus": "Completed", "tier": tier}})
    return {"success": True}


@app.post("/api/admin/generate-groups")
async def generate_groups(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_admin_user)):
    group_size = int(body.get("groupSize", 4))
    method = str(body.get("method", "genetic")).lower()
    student_docs = list(users.find({"role": "student"}))
    if len(student_docs) < 2:
        raise HTTPException(status_code=400, detail="Not enough students to form groups")

    if method == "random":
        grouped = random_grouping(student_docs, group_size)
        method_used = "random"
        extra_metrics = metrics_for_groups(grouped)
    elif method == "round_robin" or method == "round-robin":
        grouped = round_robin_grouping(student_docs, group_size)
        method_used = "round_robin"
        extra_metrics = metrics_for_groups(grouped)
    else:
        grouped, genetics = genetic_grouping(student_docs, group_size)
        method_used = "genetic"
        extra_metrics = metrics_for_groups(grouped)
        extra_metrics.update(genetics)

    groups.delete_many({})
    users.update_many({"role": "student"}, {"$set": {"groupId": None}})

    for idx, members in enumerate(grouped, start=1):
        avg_cgpa = sum(float(m.get("cgpa") or 0) for m in members) / len(members) if members else 0
        group_doc = {
            "groupNumber": idx,
            "members": [m["_id"] for m in members],
            "avgCgpa": avg_cgpa,
            "excellentCount": sum(1 for m in members if m.get("tier") == "Excellent"),
            "goodCount": sum(1 for m in members if m.get("tier") == "Good"),
            "lowCount": sum(1 for m in members if m.get("tier") == "Low"),
            "fairnessScore": calculate_group_fitness(members),
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
        gid = groups.insert_one(group_doc).inserted_id
        users.update_many({"_id": {"$in": group_doc["members"]}}, {"$set": {"groupId": gid}})

    output = await get_groups(authorization=f"Bearer {create_token(current_user)}")
    return {"method": method_used, "groups": output, "metrics": extra_metrics}


@app.post("/api/admin/compare-grouping")
async def compare_grouping(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_admin_user)):
    group_size = int(body.get("groupSize", 4))
    student_docs = list(users.find({"role": "student"}))
    if len(student_docs) < 2:
        raise HTTPException(status_code=400, detail="Not enough students to compare")

    report = []
    for method_name in ["random", "round_robin", "genetic"]:
        start = perf_counter()
        if method_name == "random":
            grouped = random_grouping(student_docs, group_size)
            method_metrics = metrics_for_groups(grouped)
        elif method_name == "round_robin":
            grouped = round_robin_grouping(student_docs, group_size)
            method_metrics = metrics_for_groups(grouped)
        else:
            grouped, genetics = genetic_grouping(student_docs, group_size)
            method_metrics = metrics_for_groups(grouped)
            method_metrics.update(genetics)
        elapsed = perf_counter() - start
        method_metrics["durationSeconds"] = elapsed

        report.append({
            "method": method_name,
            "stats": method_metrics,
            "groups": [
                {
                    "groupNumber": idx + 1,
                    "students": [s["name"] for s in group],
                    "tierCounts": {
                        "Excellent": sum(1 for s in group if s.get("tier") == "Excellent"),
                        "Good": sum(1 for s in group if s.get("tier") == "Good"),
                        "Low": sum(1 for s in group if s.get("tier") == "Low"),
                    },
                    "avgCgpa": sum(float(s.get("cgpa") or 0) for s in group) / max(1, len(group)),
                }
                for idx, group in enumerate(grouped)
            ],
        })

    return {"comparisons": report}


@app.post("/api/admin/improve-groups")
async def improve_groups(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_admin_user)):
    group_size = int(body.get("groupSize", 4))
    extra_generations = int(body.get("extraGenerations", 50))
    student_docs = list(users.find({"role": "student"}))
    if len(student_docs) < 2:
        raise HTTPException(status_code=400, detail="Not enough students to improve groups")

    current_group_docs = list(groups.find().sort("groupNumber", 1))
    baseline_groups = [
        list(users.find({"_id": {"$in": g.get("members", [])}})) for g in current_group_docs
    ]
    baseline_metrics = metrics_for_groups(baseline_groups)

    optimized_groups, genetics = genetic_grouping(student_docs, group_size, generations=extra_generations)
    optimized_metrics = metrics_for_groups(optimized_groups)
    optimized_metrics.update(genetics)

    return {
        "baseline": {"metrics": baseline_metrics, "groupCount": len(baseline_groups)},
        "optimized": {"metrics": optimized_metrics, "groupCount": len(optimized_groups)},
        "differences": {
            "totalFitnessDelta": optimized_metrics["totalFitness"] - baseline_metrics["totalFitness"]
            if baseline_metrics and "totalFitness" in baseline_metrics
            else None
        },
    }


@app.get("/api/groups")
async def get_groups(authorization: Optional[str] = Header(default=None)):
    _ = get_current_user(authorization)
    group_docs = list(groups.find().sort("groupNumber", 1))
    output = []
    for g in group_docs:
        member_docs = list(users.find({"_id": {"$in": g.get("members", [])}}, {"name": 1, "department": 1, "tier": 1, "gender": 1}))
        output.append(
            {
                "id": str(g["_id"]),
                "groupNumber": g.get("groupNumber"),
                "members": [doc_to_json(m) for m in member_docs],
                "avgCgpa": g.get("avgCgpa", 0),
                "excellentCount": g.get("excellentCount", 0),
                "goodCount": g.get("goodCount", 0),
                "lowCount": g.get("lowCount", 0),
                "fairnessScore": g.get("fairnessScore", 0),
            }
        )
    return output


@app.get("/api/admin/export-data")
async def export_data(current_user: Dict[str, Any] = Depends(get_admin_user)):
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "users": [doc_to_json(d) for d in users.find({})],
        "tests": [doc_to_json(d) for d in tests.find({})],
        "groups": [doc_to_json(d) for d in groups.find({})],
    }


@app.post("/api/admin/import-data")
async def import_data(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_admin_user)):
    users.delete_many({})
    tests.delete_many({})
    groups.delete_many({})
    if body.get("users"):
        users.insert_many(body["users"])
    if body.get("tests"):
        tests.insert_many(body["tests"])
    if body.get("groups"):
        groups.insert_many(body["groups"])
    return {"success": True, "message": "Data imported successfully"}

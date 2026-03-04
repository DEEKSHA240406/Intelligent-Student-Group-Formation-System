import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");
const JWT_SECRET = "super-secret-key-change-me";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    cgpa REAL,
    department TEXT,
    gender TEXT,
    testScore INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'Pending',
    testStatus TEXT DEFAULT 'Pending',
    groupId INTEGER
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL -- JSON string of questions
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupNumber INTEGER,
    members TEXT, -- JSON array of student IDs
    avgCgpa REAL,
    excellentCount INTEGER,
    goodCount INTEGER,
    lowCount INTEGER,
    fairnessScore REAL
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "System Admin",
    "admin@example.com",
    hashedPassword,
    "admin"
  );
}

// Seed a default test if not exists
const testExists = db.prepare("SELECT * FROM tests").get();
if (!testExists) {
  const defaultTest = {
    mcqs: [
      { id: 1, question: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], correctAnswer: "O(log n)", marks: 2 },
      { id: 2, question: "Which data structure uses LIFO?", options: ["Queue", "Stack", "Linked List", "Tree"], correctAnswer: "Stack", marks: 2 },
      { id: 3, question: "What does SQL stand for?", options: ["Structured Query Language", "Simple Query Language", "Strong Query Language", "Sequential Query Language"], correctAnswer: "Structured Query Language", marks: 2 },
      { id: 4, question: "Which of these is NOT a primitive data type in JavaScript?", options: ["String", "Number", "Boolean", "Object"], correctAnswer: "Object", marks: 2 },
      { id: 5, question: "What is the purpose of 'git clone'?", options: ["To create a new branch", "To copy a repository", "To delete a repository", "To merge branches"], correctAnswer: "To copy a repository", marks: 2 }
    ],
    coding: [
      { 
        id: 1, 
        question: "Write a function to return the sum of an array of numbers.", 
        testCases: [
          { input: "[1, 2, 3]", expectedOutput: "6" },
          { input: "[10, -5, 5]", expectedOutput: "10" }
        ],
        marks: 10
      }
    ]
  };
  db.prepare("INSERT INTO tests (title, content) VALUES (?, ?)").run("Initial Skill Assessment", JSON.stringify(defaultTest));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  });

  // Admin Routes
  app.post("/api/admin/students", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { name, email, password, cgpa, department, gender } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      db.prepare("INSERT INTO users (name, email, password, cgpa, department, gender) VALUES (?, ?, ?, ?, ?, ?)").run(
        name, email, hashedPassword, cgpa, department, gender
      );
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.get("/api/admin/students", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const students = db.prepare("SELECT id, name, email, role, cgpa, department, gender, testScore, tier, testStatus, groupId FROM users WHERE role = 'student'").all();
    res.json(students);
  });

  app.put("/api/admin/students/:id", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { id } = req.params;
    const { name, email, password, cgpa, department, gender } = req.body;
    
    try {
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare("UPDATE users SET name = ?, email = ?, password = ?, cgpa = ?, department = ?, gender = ? WHERE id = ?").run(
          name, email, hashedPassword, cgpa, department, gender, id
        );
      } else {
        db.prepare("UPDATE users SET name = ?, email = ?, cgpa = ?, department = ?, gender = ? WHERE id = ?").run(
          name, email, cgpa, department, gender, id
        );
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Failed to update student" });
    }
  });

  app.post("/api/admin/students/:id/assign-retest", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { id } = req.params;
    db.prepare("UPDATE users SET testStatus = 'Pending', testScore = 0, tier = 'Pending' WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/admin/test", authenticate, (req: any, res) => {
    const test = db.prepare("SELECT * FROM tests LIMIT 1").get();
    res.json(test ? { ...test, content: JSON.parse(test.content as string) } : null);
  });

  // Student Routes
  app.get("/api/student/profile", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, name, email, role, cgpa, department, gender, testScore, tier, testStatus, groupId FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.post("/api/student/submit-test", authenticate, (req: any, res) => {
    const { score } = req.body;
    
    let tier = "Low";
    if (score > 15) tier = "Excellent";
    else if (score >= 5) tier = "Good";

    db.prepare("UPDATE users SET testScore = ?, testStatus = 'Completed', tier = ? WHERE id = ?").run(score, tier, req.user.id);
    
    res.json({ success: true });
  });

  // Genetic Algorithm Route
  app.post("/api/admin/generate-groups", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    
    const students: any[] = db.prepare("SELECT * FROM users WHERE testStatus = 'Completed'").all();
    if (students.length < 4) return res.status(400).json({ error: "Not enough students to form groups" });

    const { runGeneticAlgorithm } = await import("./src/services/geneticAlgorithm.ts");
    const bestGroups = runGeneticAlgorithm(students, 4);

    // Clear old groups
    db.prepare("DELETE FROM groups").run();
    db.prepare("UPDATE users SET groupId = NULL").run();

    // Save new groups
    const insertGroup = db.prepare(`
      INSERT INTO groups (groupNumber, members, avgCgpa, excellentCount, goodCount, lowCount, fairnessScore)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    bestGroups.forEach(group => {
      const result = insertGroup.run(
        group.groupNumber,
        JSON.stringify(group.members.map(m => m.id)),
        group.avgCgpa,
        group.tierDistribution.excellent,
        group.tierDistribution.good,
        group.tierDistribution.low,
        group.fairnessScore
      );
      
      const groupId = result.lastInsertRowid;
      const updateStudent = db.prepare("UPDATE users SET groupId = ? WHERE id = ?");
      group.members.forEach(m => {
        updateStudent.run(groupId, m.id);
      });
    });

    res.json(bestGroups);
  });

  app.get("/api/groups", authenticate, (req: any, res) => {
    const groups = db.prepare("SELECT * FROM groups").all();
    const parsedGroups = groups.map((g: any) => {
      const memberIds = JSON.parse(g.members);
      const members = db.prepare(`SELECT id, name, department, tier, gender FROM users WHERE id IN (${memberIds.join(",")})`).all();
      return {
        ...g,
        members: members
      };
    });
    res.json(parsedGroups);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();

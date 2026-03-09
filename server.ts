  import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { VM } from "vm2";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");
const JWT_SECRET = "super-secret-key-change-me";

// Enable WAL mode for better concurrency and data safety
db.pragma('journal_mode = WAL');

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

// Code execution function using vm2 for security
function executeCode(code: string, input: string): string {
  try {
    let consoleOutput = '';
    const mockInput = input.split('\n');
    let inputIndex = 0;

    const vm = new VM({
      timeout: 5000, // 5 second timeout
      sandbox: {
        console: {
          log: (...args: any[]) => {
            consoleOutput += args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ') + '\n';
          }
        },
        prompt: () => mockInput[inputIndex++] || '',
        process: {
          stdin: {
            on: () => {},
            read: () => mockInput[inputIndex++] || ''
          }
        },
        require: undefined,
        global: undefined,
        Buffer: undefined,
        setTimeout: undefined,
        setInterval: undefined
      },
      eval: false,
      wasm: false
    });

    // Execute the code in the VM
    vm.run(code);
    
    return consoleOutput.trim();
  } catch (error) {
    throw new Error(`Code execution failed: ${error.message}`);
  }
}

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  console.log("Creating default admin user...");
  const hashedPassword = bcrypt.hashSync("susindran123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "System Admin",
    "susindranad@gmail.com",
    hashedPassword,
    "admin"
  );
  console.log("Admin user created successfully");
} else {
  console.log("Admin user already exists");
}

// Seed a default test if not exists
const testExists = db.prepare("SELECT * FROM tests").get();
if (!testExists) {
  console.log("Creating default test questions...");
  const defaultTest = {
    mcqs: [
      { id: 1, question: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], correctAnswer: "O(log n)", marks: 1 },
      { id: 2, question: "Which data structure uses LIFO?", options: ["Queue", "Stack", "Linked List", "Tree"], correctAnswer: "Stack", marks: 1 },
      { id: 3, question: "What does SQL stand for?", options: ["Structured Query Language", "Simple Query Language", "Strong Query Language", "Sequential Query Language"], correctAnswer: "Structured Query Language", marks: 1 },
      { id: 4, question: "Which of these is NOT a primitive data type in JavaScript?", options: ["String", "Number", "Boolean", "Object"], correctAnswer: "Object", marks: 1 },
      { id: 5, question: "What is the purpose of 'git clone'?", options: ["To create a new branch", "To copy a repository", "To delete a repository", "To merge branches"], correctAnswer: "To copy a repository", marks: 1 },
      { id: 6, question: "Which sorting algorithm has the best average case time complexity?", options: ["Bubble Sort", "Quick Sort", "Insertion Sort", "Selection Sort"], correctAnswer: "Quick Sort", marks: 1 },
      { id: 7, question: "What does 'DOM' stand for in web development?", options: ["Document Object Model", "Data Object Model", "Dynamic Object Model", "Document Oriented Model"], correctAnswer: "Document Object Model", marks: 1 },
      { id: 8, question: "Which HTTP method is used to retrieve data from a server?", options: ["POST", "PUT", "GET", "DELETE"], correctAnswer: "GET", marks: 1 },
      { id: 9, question: "What is the output of 'console.log(typeof null)' in JavaScript?", options: ["null", "undefined", "object", "boolean"], correctAnswer: "object", marks: 1 },
      { id: 10, question: "Which of the following is NOT a valid CSS selector?", options: [".class", "#id", "*element", "@media"], correctAnswer: "@media", marks: 1 }
    ],
    coding: [
      { 
        id: 1, 
        question: "Get two values from users and add them and store it in third variable and print the value of sum", 
        testCases: [
          { input: "5\n3", expectedOutput: "8" },
          { input: "10\n15", expectedOutput: "25" },
          { input: "-2\n7", expectedOutput: "5" }
        ],
        marks: 5
      },
      { 
        id: 2, 
        question: "Get two values from users and sub them and store it in third variable and print the value of sum", 
        testCases: [
          { input: "10\n3", expectedOutput: "7" },
          { input: "5\n8", expectedOutput: "-3" },
          { input: "0\n0", expectedOutput: "0" }
        ],
        marks: 5
      }
    ]
  };
  db.prepare("INSERT INTO tests (title, content) VALUES (?, ?)").run("Initial Skill Assessment", JSON.stringify(defaultTest));
  console.log("Default test questions created successfully");
} else {
  console.log("Test questions already exist");
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

  // Data Export/Import Routes
  app.get("/api/admin/export-data", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    
    try {
      const users = db.prepare("SELECT id, name, email, role, cgpa, department, gender, testScore, tier, testStatus, groupId FROM users").all();
      const tests = db.prepare("SELECT * FROM tests").all();
      const groups = db.prepare("SELECT * FROM groups").all();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        users,
        tests: tests.map(t => ({ ...t, content: JSON.parse(t.content) })),
        groups
      };
      
      res.json(exportData);
    } catch (err) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.post("/api/admin/import-data", authenticate, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    
    const { users, tests, groups } = req.body;
    
    try {
      // Clear existing data
      db.prepare("DELETE FROM groups").run();
      db.prepare("DELETE FROM tests").run();
      db.prepare("DELETE FROM users").run();
      
      // Import users
      if (users && users.length > 0) {
        const insertUser = db.prepare(`
          INSERT INTO users (name, email, password, role, cgpa, department, gender, testScore, tier, testStatus, groupId) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const user of users) {
          insertUser.run(
            user.name, user.email, user.password || '', user.role || 'student',
            user.cgpa, user.department, user.gender, user.testScore || 0,
            user.tier || 'Pending', user.testStatus || 'Pending', user.groupId
          );
        }
      }
      
      // Import tests
      if (tests && tests.length > 0) {
        const insertTest = db.prepare("INSERT INTO tests (title, content) VALUES (?, ?)");
        for (const test of tests) {
          insertTest.run(test.title, JSON.stringify(test.content));
        }
      }
      
      // Import groups
      if (groups && groups.length > 0) {
        const insertGroup = db.prepare(`
          INSERT INTO groups (groupNumber, members, avgCgpa, excellentCount, goodCount, lowCount, fairnessScore)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const group of groups) {
          insertGroup.run(
            group.groupNumber, group.members, group.avgCgpa,
            group.excellentCount, group.goodCount, group.lowCount, group.fairnessScore
          );
        }
      }
      
      res.json({ success: true, message: "Data imported successfully" });
    } catch (err) {
      console.error("Import error:", err);
      res.status(500).json({ error: "Failed to import data" });
    }
  });

  // Code Execution Endpoint
  app.post("/api/execute-code", authenticate, (req: any, res) => {
    const { code, input } = req.body;
    
    try {
      const result = executeCode(code, input);
      res.json({ success: true, result });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  });

  // Run Test Cases Endpoint
  app.post("/api/run-test-cases", authenticate, (req: any, res) => {
    const { code, testCases } = req.body;
    
    const results = [];
    let passedCount = 0;
    
    for (const testCase of testCases) {
      try {
        // Execute the code with the input
        const result = executeCode(code, testCase.input);
        const expected = testCase.expectedOutput.trim();
        const actual = result.trim();
        const passed = actual === expected;
        
        results.push({
          input: testCase.input,
          expected: expected,
          actual: actual,
          passed
        });
        
        if (passed) passedCount++;
      } catch (error) {
        results.push({
          input: testCase.input,
          expected: testCase.expectedOutput,
          actual: '',
          passed: false,
          error: error.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      results, 
      passedCount, 
      totalCount: testCases.length,
      score: passedCount * 5
    });
  });

  // Student Routes
  app.get("/api/student/profile", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, name, email, role, cgpa, department, gender, testScore, tier, testStatus, groupId FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.post("/api/student/submit-test", authenticate, (req: any, res) => {
    const { score } = req.body;
    
    let tier = "Low";
    if (score >= 30) tier = "Excellent";
    else if (score >= 20) tier = "Good";

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

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Received SIGINT, closing database connection...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing database connection...');
  db.close();
  process.exit(0);
});

startServer();

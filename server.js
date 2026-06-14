const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "db.json");
const TOKEN_SECRET = process.env.SEVASETU_TOKEN_SECRET || "local-demo-secret";
const allowedOrigins = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true
  })
);
app.use(express.json({ limit: "2mb" }));

function now() {
  return new Date().toISOString();
}

function money(value) {
  return Number(value || 0);
}

function id(prefix) {
  return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function nextNumberId(prefix, list) {
  const next =
    list
      .map((item) => Number(String(item.id).replace(`${prefix}-`, "")))
      .filter(Number.isFinite)
      .reduce((max, value) => Math.max(max, value), prefix === "REQ" ? 2300 : 100) + 1;
  return `${prefix}-${next}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function makeUser({ id: userId, name, email, phone, role, location, password, status = "Active" }) {
  const passwordData = hashPassword(password);
  return {
    id: userId,
    name,
    email,
    phone,
    role,
    location,
    status,
    passwordSalt: passwordData.salt,
    passwordHash: passwordData.hash,
    createdAt: now()
  };
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

function signToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 8
    })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function verifyPassword(password, user) {
  const passwordData = hashPassword(password, user.passwordSalt);
  return passwordData.hash === user.passwordHash;
}

function seedData() {
  const createdAt = now();
  return {
    users: [
      makeUser({
        id: "USR-1001",
        name: "Aarav Sharma",
        email: "citizen@sevasetu.test",
        phone: "+91 98765 43210",
        role: "citizen",
        location: "Delhi NCR",
        password: "Citizen@123"
      }),
      makeUser({
        id: "USR-2001",
        name: "Meera Verma",
        email: "agent@sevasetu.test",
        phone: "+91 99881 12233",
        role: "agent",
        location: "Delhi NCR",
        password: "Agent@123"
      }),
      makeUser({
        id: "USR-3001",
        name: "Ops Admin",
        email: "admin@sevasetu.test",
        phone: "+91 90000 11111",
        role: "admin",
        location: "Delhi NCR",
        password: "Admin@123"
      })
    ],
    services: [
      {
        id: "birth",
        name: "Birth Certificate",
        category: "Certificate",
        description: "Support for municipal birth certificate application and document readiness.",
        documents: ["Hospital discharge summary", "Parent ID proof", "Address proof"],
        eta: "5-7 days",
        charge: 499
      },
      {
        id: "income",
        name: "Income Certificate",
        category: "Revenue",
        description: "Assistance with income declaration, affidavit checklist, and revenue office process.",
        documents: ["Applicant ID proof", "Income proof", "Address proof"],
        eta: "7-10 days",
        charge: 699
      },
      {
        id: "caste",
        name: "Caste Certificate",
        category: "Certificate",
        description: "Agent support for eligibility documents and certificate application tracking.",
        documents: ["Applicant ID proof", "Family caste certificate", "Residence proof"],
        eta: "10-15 days",
        charge: 799
      },
      {
        id: "domicile",
        name: "Domicile Certificate",
        category: "Certificate",
        description: "Guided preparation of residency records, declaration forms, and appointment support.",
        documents: ["Address proof", "School or employment record", "Applicant ID proof"],
        eta: "8-12 days",
        charge: 749
      },
      {
        id: "pan",
        name: "PAN Services",
        category: "Identity",
        description: "Support for PAN application, correction, reprint, and document upload readiness.",
        documents: ["Identity proof", "Address proof", "Photograph"],
        eta: "6-9 days",
        charge: 399
      },
      {
        id: "aadhaar",
        name: "Aadhaar Services",
        category: "Identity",
        description: "Appointment and documentation support for Aadhaar updates at authorized centers.",
        documents: ["Aadhaar copy", "Supporting proof", "Mobile number"],
        eta: "3-5 days",
        charge: 299
      }
    ],
    agents: [
      {
        id: "AG-104",
        userId: "USR-2001",
        name: "Meera Verma",
        email: "agent@sevasetu.test",
        phone: "+91 99881 12233",
        location: "Delhi NCR",
        skills: ["Certificate", "Revenue", "Identity"],
        status: "Verified",
        rating: 4.8,
        earnings: 399
      },
      {
        id: "AG-118",
        userId: null,
        name: "Imran Khan",
        email: "imran.agent@example.com",
        phone: "+91 90123 45678",
        location: "Mumbai",
        skills: ["Identity", "Certificate"],
        status: "Pending",
        rating: 0,
        earnings: 0
      }
    ],
    requests: [
      {
        id: "REQ-2301",
        userId: "USR-1001",
        citizen: "Aarav Sharma",
        phone: "+91 98765 43210",
        serviceId: "birth",
        service: "Birth Certificate",
        location: "Delhi NCR",
        address: "House 42, Green Park, New Delhi",
        priority: "Standard",
        status: "Documents under review",
        agentId: "AG-104",
        agent: "Meera Verma",
        charge: 499,
        documents: ["hospital-discharge.pdf", "parent-id.pdf"],
        timeline: ["Submitted", "Agent assigned", "Documents under review"],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "REQ-2307",
        userId: "USR-1001",
        citizen: "Aarav Sharma",
        phone: "+91 98765 43210",
        serviceId: "domicile",
        service: "Domicile Certificate",
        location: "Mumbai",
        address: "Bandra West, Mumbai",
        priority: "Urgent",
        status: "Escalated",
        agentId: null,
        agent: "Unassigned",
        charge: 749,
        documents: ["address-proof.pdf"],
        timeline: ["Submitted", "Escalated"],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "REQ-2310",
        userId: "USR-1001",
        citizen: "Aarav Sharma",
        phone: "+91 98765 43210",
        serviceId: "pan",
        service: "PAN Services",
        location: "Bengaluru",
        address: "Indiranagar, Bengaluru",
        priority: "Standard",
        status: "Completed",
        agentId: "AG-104",
        agent: "Meera Verma",
        charge: 399,
        documents: ["identity-proof.pdf", "pan-acknowledgement.pdf"],
        timeline: ["Submitted", "Agent assigned", "Completed"],
        createdAt,
        updatedAt: createdAt
      }
    ],
    complaints: [
      {
        id: "CMP-101",
        requestId: "REQ-2307",
        userId: "USR-1001",
        reason: "Charge mismatch reported for domicile service.",
        status: "Open",
        createdAt
      }
    ]
  };
}

async function readDb() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    const db = seedData();
    await writeDb(db);
    return db;
  }
}

async function writeDb(db) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2));
}

async function currentUser(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = readToken(token);
  return payload ? db.users.find((user) => user.id === payload.sub) : null;
}

function requireRole(user, roles) {
  return user && roles.includes(user.role);
}

function addTimeline(request, status) {
  if (!request.timeline.includes(status)) request.timeline.push(status);
  request.updatedAt = now();
}

function analytics(db) {
  const completed = db.requests.filter((request) => request.status === "Completed").length;
  const active = db.requests.filter((request) => request.status !== "Completed").length;
  const verifiedAgents = db.agents.filter((agent) => agent.status === "Verified").length;
  return {
    registeredUsers: db.users.filter((user) => user.role === "citizen").length,
    serviceCount: db.services.length,
    verifiedAgents,
    activeRequests: active,
    totalRequests: db.requests.length,
    escalations: db.complaints.filter((complaint) => complaint.status !== "Resolved").length,
    completionRate: db.requests.length ? Math.round((completed / db.requests.length) * 100) : 0,
    satisfaction: 86
  };
}

function scopedData(db, user) {
  const agent = db.agents.find((item) => item.userId === user?.id);
  let requests = [];

  if (user?.role === "admin") {
    requests = db.requests;
  } else if (user?.role === "agent") {
    requests = db.requests.filter((request) => !request.agentId || request.agentId === agent?.id || request.status === "Escalated");
  } else if (user?.role === "citizen") {
    requests = db.requests.filter((request) => request.userId === user.id);
  }

  return {
    user: publicUser(user),
    services: db.services,
    agents: user?.role === "admin" ? db.agents : db.agents.filter((item) => item.status === "Verified"),
    requests,
    complaints: user?.role === "admin" ? db.complaints : db.complaints.filter((item) => item.userId === user?.id),
    analytics: analytics(db)
  };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/bootstrap", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  res.json(scopedData(db, user));
});

app.post("/api/reset", async (req, res) => {
  const db = seedData();
  await writeDb(db);
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const db = await readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === String(req.body.email || "").toLowerCase());
  if (!user || !verifyPassword(req.body.password || "", user)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (user.status !== "Active") {
    return res.status(403).json({ message: "Account is pending admin approval" });
  }
  res.json({ token: signToken(user), data: scopedData(db, user) });
});

app.post("/api/auth/register", async (req, res) => {
  const db = await readDb();
  const email = String(req.body.email || "").toLowerCase();
  if (db.users.some((user) => user.email.toLowerCase() === email)) {
    return res.status(409).json({ message: "Email already exists" });
  }
  const user = makeUser({
    id: id("USR"),
    name: req.body.name,
    email,
    phone: req.body.phone,
    role: "citizen",
    location: req.body.location || "Delhi NCR",
    password: req.body.password
  });
  db.users.push(user);
  await writeDb(db);
  res.status(201).json({ token: signToken(user), data: scopedData(db, user) });
});

app.post("/api/agents/register", async (req, res) => {
  const db = await readDb();
  const email = String(req.body.email || "").toLowerCase();
  if (db.users.some((user) => user.email.toLowerCase() === email)) {
    return res.status(409).json({ message: "Email already exists" });
  }
  const user = makeUser({
    id: id("USR"),
    name: req.body.name,
    email,
    phone: req.body.phone,
    role: "agent",
    location: req.body.location || "Delhi NCR",
    password: req.body.password,
    status: "Pending"
  });
  const agent = {
    id: id("AG"),
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    skills: String(req.body.skills || "Certificate").split(",").map((skill) => skill.trim()).filter(Boolean),
    status: "Pending",
    rating: 0,
    earnings: 0
  };
  db.users.push(user);
  db.agents.push(agent);
  await writeDb(db);
  res.status(201).json({ agent });
});

app.post("/api/requests", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["citizen"])) return res.status(403).json({ message: "Citizen access required" });

  const service = db.services.find((item) => item.id === req.body.serviceId);
  if (!service) return res.status(404).json({ message: "Service not found" });

  const request = {
    id: nextNumberId("REQ", db.requests),
    userId: user.id,
    citizen: req.body.citizen || user.name,
    phone: req.body.phone || user.phone,
    serviceId: service.id,
    service: service.name,
    location: req.body.location || user.location,
    address: req.body.address || "",
    priority: req.body.priority || "Standard",
    status: "Submitted",
    agentId: null,
    agent: "Unassigned",
    charge: service.charge,
    documents: Array.isArray(req.body.documents) ? req.body.documents : [],
    timeline: ["Submitted"],
    createdAt: now(),
    updatedAt: now()
  };

  db.requests.unshift(request);
  await writeDb(db);
  res.status(201).json({ data: scopedData(db, user) });
});

app.patch("/api/requests/:id/accept", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["agent"])) return res.status(403).json({ message: "Agent access required" });

  const agent = db.agents.find((item) => item.userId === user.id);
  const request = db.requests.find((item) => item.id === req.params.id);
  if (!agent || agent.status !== "Verified") return res.status(403).json({ message: "Agent must be verified" });
  if (!request) return res.status(404).json({ message: "Request not found" });

  request.agentId = agent.id;
  request.agent = agent.name;
  request.status = "Documents under review";
  addTimeline(request, "Agent assigned");
  addTimeline(request, "Documents under review");
  await writeDb(db);
  res.json({ data: scopedData(db, user) });
});

app.patch("/api/requests/:id/reject", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["agent"])) return res.status(403).json({ message: "Agent access required" });

  const request = db.requests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  request.agentId = null;
  request.agent = "Unassigned";
  request.status = "Rejected";
  addTimeline(request, "Rejected");
  await writeDb(db);
  res.json({ data: scopedData(db, user) });
});

app.patch("/api/requests/:id/status", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["agent", "admin"])) return res.status(403).json({ message: "Agent or admin access required" });

  const request = db.requests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  request.status = req.body.status;
  addTimeline(request, req.body.status);
  if (req.body.status === "Completed" && request.agentId) {
    const agent = db.agents.find((item) => item.id === request.agentId);
    if (agent) agent.earnings += money(request.charge);
  }
  await writeDb(db);
  res.json({ data: scopedData(db, user) });
});

app.post("/api/requests/:id/documents", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["citizen", "agent", "admin"])) return res.status(403).json({ message: "Login required" });

  const request = db.requests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  const docs = Array.isArray(req.body.documents) ? req.body.documents : [];
  request.documents.push(...docs);
  if (req.body.completed) {
    request.status = "Completed";
    addTimeline(request, "Completed");
    if (request.agentId) {
      const agent = db.agents.find((item) => item.id === request.agentId);
      if (agent) agent.earnings += money(request.charge);
    }
  } else {
    addTimeline(request, "Documents uploaded");
  }
  await writeDb(db);
  res.json({ data: scopedData(db, user) });
});

app.post("/api/complaints", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["citizen"])) return res.status(403).json({ message: "Citizen access required" });

  const request = db.requests.find((item) => item.id === req.body.requestId && item.userId === user.id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  const complaint = {
    id: nextNumberId("CMP", db.complaints),
    requestId: request.id,
    userId: user.id,
    reason: req.body.reason,
    status: "Open",
    createdAt: now()
  };
  request.status = "Escalated";
  addTimeline(request, "Escalated");
  db.complaints.unshift(complaint);
  await writeDb(db);
  res.status(201).json({ data: scopedData(db, user) });
});

app.patch("/api/complaints/:id", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["admin"])) return res.status(403).json({ message: "Admin access required" });

  const complaint = db.complaints.find((item) => item.id === req.params.id);
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });
  complaint.status = req.body.status || complaint.status;
  await writeDb(db);
  res.json({ data: scopedData(db, user) });
});

app.patch("/api/agents/:id/verify", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["admin"])) return res.status(403).json({ message: "Admin access required" });

  const agent = db.agents.find((item) => item.id === req.params.id);
  if (!agent) return res.status(404).json({ message: "Agent not found" });
  agent.status = req.body.status || "Verified";
  const agentUser = db.users.find((item) => item.id === agent.userId);
  if (agentUser) agentUser.status = agent.status === "Verified" ? "Active" : agent.status;
  await writeDb(db);
  res.json({ data: scopedData(db, user) });
});

app.post("/api/services", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["admin"])) return res.status(403).json({ message: "Admin access required" });

  const service = {
    id: String(req.body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: req.body.name,
    category: req.body.category,
    description: req.body.description,
    documents: String(req.body.documents || "").split(",").map((doc) => doc.trim()).filter(Boolean),
    eta: req.body.eta,
    charge: Number(req.body.charge)
  };
  db.services.push(service);
  await writeDb(db);
  res.status(201).json({ data: scopedData(db, user) });
});

app.patch("/api/services/:id", async (req, res) => {
  const db = await readDb();
  const user = await currentUser(req, db);
  if (!requireRole(user, ["admin"])) return res.status(403).json({ message: "Admin access required" });

  const service = db.services.find((item) => item.id === req.params.id);
  if (!service) return res.status(404).json({ message: "Service not found" });
  if (req.body.charge) service.charge = Number(req.body.charge);
  if (req.body.eta) service.eta = req.body.eta;
  await writeDb(db);
  res.json({ data: scopedData(db, user) });
});

const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir));
app.get("*", async (req, res) => {
  try {
    await fs.access(path.join(distDir, "index.html"));
    res.sendFile(path.join(distDir, "index.html"));
  } catch {
    res.status(200).send("Run npm run frontend for the React app, or npm run build then npm start.");
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Node backend running at http://${HOST}:${PORT}`);
});

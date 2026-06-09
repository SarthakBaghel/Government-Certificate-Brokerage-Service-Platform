const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${body.message || JSON.stringify(body)}`);
  }
  return body;
}

const health = await request("/api/health");
if (!health.ok) throw new Error("Health check failed");

await request("/api/reset", { method: "POST" });

const login = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "citizen@sevasetu.test",
    password: "Citizen@123"
  })
});

if (!login.token || login.data.user.role !== "citizen") {
  throw new Error("Citizen login failed");
}

const created = await request("/api/requests", {
  method: "POST",
  headers: { Authorization: `Bearer ${login.token}` },
  body: JSON.stringify({
    serviceId: "income",
    citizen: "Aarav Sharma",
    phone: "+91 98765 43210",
    location: "Delhi NCR",
    address: "House 42, Green Park, New Delhi",
    priority: "Standard",
    documents: ["income-proof.pdf"]
  })
});

if (!created.data.requests.some((item) => item.service === "Income Certificate")) {
  throw new Error("Request creation failed");
}

await request("/api/reset", { method: "POST" });

console.log("Smoke test passed");

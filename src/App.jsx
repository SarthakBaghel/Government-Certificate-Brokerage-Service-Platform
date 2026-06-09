import { useEffect, useMemo, useState } from "react";

const API = "/api";
const demoAccounts = [
  { role: "Citizen", email: "citizen@sevasetu.test", password: "Citizen@123" },
  { role: "Agent", email: "agent@sevasetu.test", password: "Agent@123" },
  { role: "Admin", email: "admin@sevasetu.test", password: "Admin@123" }
];

const emptyRequest = {
  citizen: "",
  phone: "",
  location: "Delhi NCR",
  address: "",
  priority: "Standard",
  documents: []
};

function currency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function shortDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function statusColor(status) {
  if (status === "Completed" || status === "Verified" || status === "Resolved") return "bg-green-100 text-green-800";
  if (status === "Escalated" || status === "Rejected") return "bg-red-100 text-red-800";
  if (status === "Pending" || status === "Submitted") return "bg-amber-100 text-amber-800";
  return "bg-teal/10 text-teal";
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("sevasetu_token") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [authMode, setAuthMode] = useState("login");

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Request failed");
    return result;
  }

  async function load() {
    setLoading(true);
    try {
      const result = await api("/bootstrap");
      setData(result);
    } catch {
      setData(null);
      localStorage.removeItem("sevasetu_token");
      setToken("");
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("sevasetu_token", result.token);
      setToken(result.token);
      setData(result.data);
      setMessage(`Logged in as ${result.data.user.role}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function resetDemo() {
    await api("/reset", { method: "POST" });
    localStorage.removeItem("sevasetu_token");
    setToken("");
    setData(null);
    setMessage("Demo data reset. Login again with a demo account.");
  }

  function logout() {
    localStorage.removeItem("sevasetu_token");
    setToken("");
    setData(null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm font-bold text-muted">Loading SevaSetu...</div>;
  }

  return (
    <div className="min-h-screen">
      <Header user={data?.user} onLogout={logout} onReset={resetDemo} />

      {message && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="card border-teal/30 bg-teal/5 px-4 py-3 text-sm font-semibold text-teal">{message}</div>
        </div>
      )}

      {!data?.user ? (
        <AuthScreen authMode={authMode} setAuthMode={setAuthMode} login={login} setMessage={setMessage} />
      ) : (
        <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
          {data.user.role === "citizen" && <CitizenDashboard data={data} api={api} setData={setData} setMessage={setMessage} />}
          {data.user.role === "agent" && <AgentDashboard data={data} api={api} setData={setData} setMessage={setMessage} />}
          {data.user.role === "admin" && <AdminDashboard data={data} api={api} setData={setData} setMessage={setMessage} />}
        </main>
      )}
    </div>
  );
}

function Header({ user, onLogout, onReset }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-teal font-black text-white">SS</div>
          <div>
            <p className="text-xs font-black uppercase text-muted">Unified Mentor CSC</p>
            <h1 className="text-xl font-black">SevaSetu</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user && <span className="pill bg-white text-muted">{user.name} | {user.role}</span>}
          {user && <button className="btn-secondary" onClick={onLogout}>Logout</button>}
          <button className="btn-secondary" onClick={onReset}>Reset Demo</button>
        </div>
      </div>
    </header>
  );
}

function AuthScreen({ authMode, setAuthMode, login, setMessage }) {
  const [form, setForm] = useState({
    name: "New Citizen",
    email: "newcitizen@example.com",
    phone: "+91 90000 00000",
    location: "Delhi NCR",
    password: "Password@123"
  });

  async function submitRegister(event) {
    event.preventDefault();
    try {
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Registration failed");
      localStorage.setItem("sevasetu_token", result.token);
      window.location.reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitAgent(event) {
    event.preventDefault();
    try {
      const response = await fetch(`${API}/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skills: "Certificate, Identity" })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Agent registration failed");
      setMessage(`${result.agent.name} submitted for admin verification.`);
      setAuthMode("login");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_420px]">
      <section className="card overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_260px] md:items-center">
          <div>
            <p className="text-xs font-black uppercase text-teal">Government certificate assistance</p>
            <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
              Citizens request help, verified agents manage work, admins monitor everything.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              This project covers certificate requests, document metadata upload, request tracking, agent verification,
              service pricing, complaints, and KPI analytics.
            </p>
          </div>
          <img className="rounded-lg border border-line bg-white" src="/assets/certificate-assistance.svg" alt="Certificate assistance illustration" />
        </div>
      </section>

      <section className="card p-5">
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-stone-50 p-1">
          {["login", "citizen", "agent"].map((mode) => (
            <button
              className={`rounded-md px-3 py-2 text-sm font-bold ${authMode === mode ? "bg-teal text-white" : "text-muted"}`}
              key={mode}
              onClick={() => setAuthMode(mode)}
            >
              {mode === "login" ? "Login" : mode === "citizen" ? "Register" : "Agent"}
            </button>
          ))}
        </div>

        {authMode === "login" && (
          <div className="mt-5 grid gap-3">
            <p className="text-sm font-bold text-muted">Use a demo account:</p>
            {demoAccounts.map((account) => (
              <button
                className="btn-secondary flex items-center justify-between"
                key={account.email}
                onClick={() => login(account.email, account.password)}
              >
                <span>{account.role}</span>
                <span className="text-xs text-muted">{account.email}</span>
              </button>
            ))}
          </div>
        )}

        {authMode === "citizen" && (
          <RegisterForm form={form} setForm={setForm} onSubmit={submitRegister} buttonText="Create citizen account" />
        )}

        {authMode === "agent" && (
          <RegisterForm form={form} setForm={setForm} onSubmit={submitAgent} buttonText="Submit agent verification" />
        )}
      </section>
    </main>
  );
}

function RegisterForm({ form, setForm, onSubmit, buttonText }) {
  return (
    <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
      <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
      <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
      <button className="btn-primary" type="submit">{buttonText}</button>
    </form>
  );
}

function Metrics({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <article className="card p-4" key={item.label}>
          <p className="text-sm font-bold text-muted">{item.label}</p>
          <strong className="mt-2 block text-2xl font-black">{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function CitizenDashboard({ data, api, setData, setMessage }) {
  const [selectedService, setSelectedService] = useState(data.services[0]?.id || "");
  const [form, setForm] = useState({ ...emptyRequest, citizen: data.user.name, phone: data.user.phone, location: data.user.location });
  const [complaint, setComplaint] = useState({ requestId: "", reason: "" });

  const service = data.services.find((item) => item.id === selectedService) || data.services[0];

  async function createRequest(event) {
    event.preventDefault();
    try {
      const result = await api("/requests", {
        method: "POST",
        body: JSON.stringify({ ...form, serviceId: service.id })
      });
      setData(result.data);
      setMessage("Service request submitted.");
      setForm({ ...emptyRequest, citizen: data.user.name, phone: data.user.phone, location: data.user.location });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function raiseComplaint(event) {
    event.preventDefault();
    try {
      const result = await api("/complaints", {
        method: "POST",
        body: JSON.stringify(complaint)
      });
      setData(result.data);
      setComplaint({ requestId: "", reason: "" });
      setMessage("Complaint raised for admin review.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <>
      <SectionTitle eyebrow="Citizen Portal" title="Government certificate assistance" />
      <Metrics
        items={[
          { label: "Available services", value: data.analytics.serviceCount || data.services.length },
          { label: "My requests", value: data.requests.length },
          { label: "Completion rate", value: `${data.analytics.completionRate}%` },
          { label: "Open complaints", value: data.complaints.filter((item) => item.status !== "Resolved").length }
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="card p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-black">Services</h3>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="sm:w-64">
              {data.services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.services.map((item) => (
              <button
                className={`rounded-lg border p-4 text-left ${item.id === selectedService ? "border-teal bg-teal/5" : "border-line bg-white"}`}
                key={item.id}
                onClick={() => setSelectedService(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black">{item.name}</h4>
                    <p className="mt-2 text-sm leading-5 text-muted">{item.description}</p>
                  </div>
                  <span className="pill bg-stone-100 text-muted">{item.category}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="pill bg-teal/10 text-teal">{currency(item.charge)}</span>
                  <span className="pill bg-amber-100 text-amber-800">{item.eta}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="card p-5">
          <h3 className="text-lg font-black">New request</h3>
          {service && (
            <div className="mt-3 rounded-lg bg-stone-50 p-3">
              <p className="font-bold">{service.name}</p>
              <p className="text-sm text-muted">Required: {service.documents.join(", ")}</p>
            </div>
          )}
          <form className="mt-4 grid gap-3" onSubmit={createRequest}>
            <label>Name<input value={form.citizen} onChange={(e) => setForm({ ...form, citizen: e.target.value })} required /></label>
            <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
            <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></label>
            <label>Address<textarea rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Standard</option>
                <option>Urgent</option>
                <option>Senior citizen support</option>
              </select>
            </label>
            <label>
              Documents
              <input
                type="file"
                multiple
                onChange={(e) => setForm({ ...form, documents: Array.from(e.target.files).map((file) => file.name) })}
              />
            </label>
            <button className="btn-primary" type="submit">Submit request</button>
          </form>
        </aside>
      </div>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <RequestList requests={data.requests} />
        <div className="card p-5">
          <h3 className="text-lg font-black">Raise complaint</h3>
          <form className="mt-4 grid gap-3" onSubmit={raiseComplaint}>
            <label>
              Request
              <select value={complaint.requestId} onChange={(e) => setComplaint({ ...complaint, requestId: e.target.value })} required>
                <option value="">Select request</option>
                {data.requests.map((request) => <option key={request.id} value={request.id}>{request.id} - {request.service}</option>)}
              </select>
            </label>
            <label>Reason<textarea rows="3" value={complaint.reason} onChange={(e) => setComplaint({ ...complaint, reason: e.target.value })} required /></label>
            <button className="btn-secondary" type="submit">Submit complaint</button>
          </form>
        </div>
      </section>
    </>
  );
}

function AgentDashboard({ data, api, setData, setMessage }) {
  async function accept(idValue) {
    try {
      const result = await api(`/requests/${idValue}/accept`, { method: "PATCH", body: JSON.stringify({}) });
      setData(result.data);
      setMessage(`${idValue} accepted.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateStatus(idValue, status) {
    try {
      const result = await api(`/requests/${idValue}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setData(result.data);
      setMessage(`${idValue} updated.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function reject(idValue) {
    try {
      const result = await api(`/requests/${idValue}/reject`, { method: "PATCH", body: JSON.stringify({}) });
      setData(result.data);
      setMessage(`${idValue} rejected.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function uploadCompleted(idValue, files) {
    try {
      const result = await api(`/requests/${idValue}/documents`, {
        method: "POST",
        body: JSON.stringify({ documents: Array.from(files).map((file) => file.name), completed: true })
      });
      setData(result.data);
      setMessage(`${idValue} completed document uploaded.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const openRequests = data.requests.filter((request) => request.status !== "Completed");

  return (
    <>
      <SectionTitle eyebrow="Agent Workspace" title="Assigned service requests" />
      <Metrics
        items={[
          { label: "Open queue", value: openRequests.length },
          { label: "Completed", value: data.requests.filter((request) => request.status === "Completed").length },
          { label: "Estimated earnings", value: currency(data.requests.filter((request) => request.status === "Completed").reduce((sum, request) => sum + request.charge, 0)) },
          { label: "Verified agents", value: data.analytics.verifiedAgents }
        ]}
      />

      <section className="grid gap-4">
        {openRequests.map((request) => (
          <article className="card p-5" key={request.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-black">{request.id} - {request.service}</h3>
                <p className="mt-1 text-sm text-muted">{request.citizen} | {request.phone} | {request.location}</p>
              </div>
              <span className={`pill ${statusColor(request.status)}`}>{request.status}</span>
            </div>
            <p className="mt-3 text-sm text-muted">Documents: {request.documents.join(", ") || "Not uploaded"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!request.agentId && <button className="btn-secondary" onClick={() => accept(request.id)}>Accept</button>}
              {!request.agentId && <button className="btn-danger" onClick={() => reject(request.id)}>Reject</button>}
              <select className="max-w-xs" value={request.status} onChange={(e) => updateStatus(request.id, e.target.value)}>
                <option>Submitted</option>
                <option>Documents under review</option>
                <option>Submitted to office</option>
                <option>Field visit scheduled</option>
                <option>Completed</option>
              </select>
              <label className="btn-secondary cursor-pointer">
                Upload completed file
                <input className="hidden" type="file" onChange={(e) => uploadCompleted(request.id, e.target.files)} />
              </label>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function AdminDashboard({ data, api, setData, setMessage }) {
  const [serviceForm, setServiceForm] = useState({
    name: "Marriage Certificate",
    category: "Certificate",
    description: "Assistance with marriage certificate application and documents.",
    documents: "ID proof, Address proof, Marriage proof",
    eta: "7-12 days",
    charge: 899
  });

  async function verifyAgent(idValue, status) {
    try {
      const result = await api(`/agents/${idValue}/verify`, { method: "PATCH", body: JSON.stringify({ status }) });
      setData(result.data);
      setMessage(`Agent marked ${status}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addService(event) {
    event.preventDefault();
    try {
      const result = await api("/services", { method: "POST", body: JSON.stringify(serviceForm) });
      setData(result.data);
      setMessage("Service added.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateComplaint(idValue, status) {
    try {
      const result = await api(`/complaints/${idValue}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setData(result.data);
      setMessage(`Complaint marked ${status}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateService(service, patch) {
    try {
      const result = await api(`/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      setData(result.data);
      setMessage(`${service.name} updated.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <>
      <SectionTitle eyebrow="Admin Console" title="Operations and verification" />
      <Metrics
        items={[
          { label: "Registered users", value: data.analytics.registeredUsers },
          { label: "Verified agents", value: data.analytics.verifiedAgents },
          { label: "Active requests", value: data.analytics.activeRequests },
          { label: "Escalations", value: data.analytics.escalations }
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="text-lg font-black">Agent verification</h3>
          <div className="mt-4 grid gap-3">
            {data.agents.map((agent) => (
              <article className="rounded-lg border border-line bg-stone-50 p-4" key={agent.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black">{agent.name}</h4>
                    <p className="text-sm text-muted">{agent.location} | {agent.skills.join(", ")}</p>
                  </div>
                  <span className={`pill ${statusColor(agent.status)}`}>{agent.status}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-secondary" onClick={() => verifyAgent(agent.id, "Verified")}>Approve</button>
                  <button className="btn-danger" onClick={() => verifyAgent(agent.id, "Rejected")}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="text-lg font-black">Add service</h3>
          <form className="mt-4 grid gap-3" onSubmit={addService}>
            <label>Name<input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required /></label>
            <label>Category<input value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} required /></label>
            <label>Description<textarea rows="2" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></label>
            <label>Required documents<input value={serviceForm.documents} onChange={(e) => setServiceForm({ ...serviceForm, documents: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>ETA<input value={serviceForm.eta} onChange={(e) => setServiceForm({ ...serviceForm, eta: e.target.value })} /></label>
              <label>Charge<input type="number" value={serviceForm.charge} onChange={(e) => setServiceForm({ ...serviceForm, charge: e.target.value })} /></label>
            </div>
            <button className="btn-primary" type="submit">Add service</button>
          </form>
        </section>
      </div>

      <section className="card overflow-x-auto p-5">
        <h3 className="text-lg font-black">Request monitor</h3>
        <table className="mt-4 min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="py-2">Request</th>
              <th>Citizen</th>
              <th>Service</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.requests.map((request) => (
              <tr className="border-t border-line" key={request.id}>
                <td className="py-3 font-bold">{request.id}</td>
                <td>{request.citizen}</td>
                <td>{request.service}</td>
                <td>{request.agent}</td>
                <td><span className={`pill ${statusColor(request.status)}`}>{request.status}</span></td>
                <td>{shortDate(request.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto p-5">
        <h3 className="text-lg font-black">Service pricing</h3>
        <table className="mt-4 min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="py-2">Service</th>
              <th>Category</th>
              <th>ETA</th>
              <th>Charge</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((service) => (
              <ServicePriceRow key={service.id} service={service} updateService={updateService} />
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="text-lg font-black">Complaints</h3>
          <div className="mt-4 grid gap-3">
            {data.complaints.map((item) => (
              <article className="rounded-lg border border-line bg-stone-50 p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black">{item.id} | {item.requestId}</h4>
                    <p className="text-sm text-muted">{item.reason}</p>
                  </div>
                  <span className={`pill ${statusColor(item.status)}`}>{item.status}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-secondary" onClick={() => updateComplaint(item.id, "In review")}>Review</button>
                  <button className="btn-primary" onClick={() => updateComplaint(item.id, "Resolved")}>Resolve</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="text-lg font-black">KPI analytics</h3>
          <div className="mt-4 grid gap-3">
            {[
              ["Completion rate", data.analytics.completionRate],
              ["Satisfaction", data.analytics.satisfaction],
              ["Active request share", Math.min(100, data.analytics.activeRequests * 25)],
              ["Verified agent coverage", Math.min(100, data.analytics.verifiedAgents * 40)]
            ].map(([label, value]) => (
              <div className="grid grid-cols-[140px_1fr_44px] items-center gap-3" key={label}>
                <span className="text-sm font-bold text-muted">{label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${value}%` }} />
                </div>
                <strong className="text-sm">{value}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ServicePriceRow({ service, updateService }) {
  const [charge, setCharge] = useState(service.charge);
  const [eta, setEta] = useState(service.eta);

  return (
    <tr className="border-t border-line">
      <td className="py-3 font-bold">{service.name}</td>
      <td>{service.category}</td>
      <td><input className="w-32" value={eta} onChange={(e) => setEta(e.target.value)} /></td>
      <td><input className="w-28" type="number" value={charge} onChange={(e) => setCharge(e.target.value)} /></td>
      <td><button className="btn-secondary" onClick={() => updateService(service, { charge, eta })}>Save</button></td>
    </tr>
  );
}

function RequestList({ requests }) {
  return (
    <section className="card p-5">
      <h3 className="text-lg font-black">Request history</h3>
      <div className="mt-4 grid gap-3">
        {requests.map((request) => (
          <article className="rounded-lg border border-line bg-stone-50 p-4" key={request.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h4 className="font-black">{request.id} - {request.service}</h4>
                <p className="mt-1 text-sm text-muted">{request.location} | {currency(request.charge)} | Agent: {request.agent}</p>
              </div>
              <span className={`pill ${statusColor(request.status)}`}>{request.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {request.timeline.map((step) => <span className="pill bg-white text-muted" key={step}>{step}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-teal">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black md:text-3xl">{title}</h2>
    </div>
  );
}

export default App;

import { useEffect, useState, useCallback } from "react";

const API = "/api/admin/users"; // adjust to your backend base URL


export default function AdminRegistrations() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/pending`, { credentials: "include" });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setUsers(await res.json());
    } catch (e) {
      setError(`Could not load registrations. ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (user, action) => {
    setBusyId(user.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`${API}/${user.id}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      const label = displayName(user);
      setNotice(action === "approve" ? `${label} approved. They can now log in.` : `${label} declined.`);
    } catch (e) {
      setError(`Could not ${action} this registration. ${e.message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ar">
      <div className="ar-wrap">
        <h1>Pending registrations</h1>
        <p className="ar-sub">Approved users can log in. Declined registrations are removed.</p>

        {error && <div className="ar-msg ar-err" role="alert">{error}</div>}
        {notice && <div className="ar-msg ar-okmsg" role="status">{notice}</div>}

        {loading ? (
          <div className="ar-empty">Loading registrations…</div>
        ) : users.length === 0 ? (
          <div className="ar-empty">No registrations waiting for review.</div>
        ) : (
          users.map((u) => (
            <div className="ar-row" key={u.id}>
              <div className="ar-info">
                <div className="ar-name">{displayName(u)}</div>
                <div className="ar-meta">{u.email}</div>
              </div>
              <div className="ar-actions">
                <button
                  className="ar-approve"
                  disabled={busyId === u.id}
                  onClick={() => act(u, "approve")}
                >
                  Approve
                </button>
                <button
                  className="ar-decline"
                  disabled={busyId === u.id}
                  onClick={() => act(u, "decline")}
                >
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function displayName(u) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.name || u.username || u.email;
}
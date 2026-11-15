import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // replaces th:if="${param.success}"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser's default form submission
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        navigate("/dashboard"); // the "redirect" now happens in React
      } else {
        setError("Invalid username or password.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h2>Welcome to the First Static Page, login to continue:</h2>

      <div className="login-form">
        <form onSubmit={handleSubmit} className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      {searchParams.has("success") && (
        <p style={{ color: "green" }}>Account created successfully</p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <Link to="/createAccount" className="btn btn-secondary">
        Create Account
      </Link>
      <Link to="/adminLogin" className="btn btn-secondary">
        Admin
      </Link>
    </div>
  );
}
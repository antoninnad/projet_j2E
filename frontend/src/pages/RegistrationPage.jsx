import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const initialForm = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({}); // field errors, e.g. { email: "Already used" }
  const [formError, setFormError] = useState(""); // general error not tied to a field
  const [loading, setLoading] = useState(false);

  // One handler for every input: uses the input's "name" attribute as the key
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError("");

    // Quick check before calling the server
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        navigate("/login?success"); // login page shows "account created"
        return;
      }

      // Expected 400 body: { "errors": { "username": "...", "email": "..." } }
      const data = await res.json().catch(() => ({}));
      if (data.errors) {
        setErrors(data.errors);
      } else {
        setFormError(data.error || "Could not create the account.");
      }
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Small helper to avoid repeating the error span for every field
  const FieldError = ({ name }) =>
    errors[name] ? <span className="error" style={{ color: "red" }}>{errors[name]}</span> : null;

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <h1>Create an account</h1>

        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <FieldError name="username" />

        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <FieldError name="email" />

        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />
        <FieldError name="password" />

        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />
        <FieldError name="confirmPassword" />

        <label htmlFor="firstName">
          First name <span className="optional">(optional)</span>
        </label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
        />
        <FieldError name="firstName" />

        <label htmlFor="lastName">
          Last name <span className="optional">(optional)</span>
        </label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
        />
        <FieldError name="lastName" />

        {formError && <p style={{ color: "red" }}>{formError}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient";

// mode: 'signin' | 'signup' | 'forgot' | 'reset'
export default function Auth({ mode: initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | busy | done | error
  const [message, setMessage] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);

  const reset = () => {
    setStatus("idle");
    setMessage("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("busy");
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setMessage(error.message);
      }
      // on success, the session listener in App.jsx takes over
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setStatus("error");
        setMessage("Password needs to be at least 6 characters.");
        return;
      }
      if (password !== confirm) {
        setStatus("error");
        setMessage("Passwords don't match.");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("done");
        setMessage("Check your email to confirm your account, then sign in.");
      }
      return;
    }

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("done");
        setMessage("Check your email for a password reset link.");
      }
      return;
    }

    if (mode === "reset") {
      if (password.length < 6) {
        setStatus("error");
        setMessage("Password needs to be at least 6 characters.");
        return;
      }
      if (password !== confirm) {
        setStatus("error");
        setMessage("Passwords don't match.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("done");
        setMessage("Password updated — you're signed in.");
      }
      return;
    }
  };

  const switchMode = (next) => {
    setMode(next);
    reset();
  };

  const titles = {
    signin: "Sign in",
    signup: "Create an account",
    forgot: "Reset your password",
    reset: "Set a new password",
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        {logoFailed ? null : (
          <img
            src="/b31sb3lrs6tg1.png"
            alt=""
            style={styles.logo}
            onError={() => setLogoFailed(true)}
          />
        )}
        <h1 style={styles.title}>Atmos Tracker</h1>
        <p style={styles.sub}>{titles[mode]}</p>

        {status === "done" ? (
          <p style={styles.doneMsg}>{message}</p>
        ) : (
          <form onSubmit={submit} style={styles.form}>
            {mode !== "reset" && (
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            )}
            {(mode === "signin" || mode === "signup" || mode === "reset") && (
              <input
                type="password"
                required
                minLength={6}
                placeholder={mode === "reset" ? "New password" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            )}
            {(mode === "signup" || mode === "reset") && (
              <input
                type="password"
                required
                minLength={6}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={styles.input}
              />
            )}
            <button type="submit" disabled={status === "busy"} style={styles.button}>
              {status === "busy"
                ? "Please wait..."
                : { signin: "Sign in", signup: "Create account", forgot: "Send reset link", reset: "Update password" }[mode]}
            </button>
          </form>
        )}

        {status === "error" && <p style={styles.errorMsg}>{message}</p>}

        {mode === "signin" && (
          <p style={styles.switchRow}>
            <button style={styles.linkBtn} onClick={() => switchMode("forgot")}>
              Forgot password?
            </button>
            <span style={styles.dot}>&middot;</span>
            <button style={styles.linkBtn} onClick={() => switchMode("signup")}>
              Create an account
            </button>
          </p>
        )}
        {mode === "signup" && (
          <p style={styles.switchRow}>
            <button style={styles.linkBtn} onClick={() => switchMode("signin")}>
              Already have an account? Sign in
            </button>
          </p>
        )}
        {mode === "forgot" && (
          <p style={styles.switchRow}>
            <button style={styles.linkBtn} onClick={() => switchMode("signin")}>
              Back to sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #413691 0%, #d2386e 100%)",
    fontFamily: "system-ui, sans-serif",
    padding: 16,
  },
  card: {
    background: "#2b255d",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: 28,
    width: 320,
    maxWidth: "100%",
    color: "#f8f6fd",
    textAlign: "center",
  },
  logo: { width: 200, height: "auto", display: "block", margin: "0 auto 16px", borderRadius: 8 },
  title: { margin: "0 0 4px 0", fontSize: 20, fontWeight: 700 },
  sub: { margin: "0 0 18px 0", fontSize: 13, color: "#d3c6ec" },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: {
    background: "#322a68",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#f8f6fd",
    fontSize: 14,
  },
  button: {
    background: "#f9423a",
    color: "#2b0e0c",
    border: "none",
    borderRadius: 9,
    padding: "10px 12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  doneMsg: { fontSize: 13.5, lineHeight: 1.5 },
  errorMsg: { fontSize: 12.5, color: "#ff6f79", marginTop: 10 },
  switchRow: { fontSize: 12.5, color: "#d3c6ec", marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" },
  linkBtn: { background: "none", border: "none", color: "#ef5c95", fontSize: 12.5, cursor: "pointer", padding: 0, fontWeight: 600 },
  dot: { color: "#d3c6ec" },
};

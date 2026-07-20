import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Atmos Tracker</h1>
        <p style={styles.sub}>Sign in with your email to see your points.</p>
        {status === "sent" ? (
          <p style={styles.sentMsg}>
            Check <strong>{email}</strong> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={submit} style={styles.form}>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <button type="submit" disabled={status === "sending"} style={styles.button}>
              {status === "sending" ? "Sending..." : "Send sign-in link"}
            </button>
          </form>
        )}
        {status === "error" && <p style={styles.errorMsg}>{errorMsg}</p>}
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
    background: "#0d1b2a",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    background: "#12283a",
    border: "1px solid #22394f",
    borderRadius: 14,
    padding: 28,
    width: 320,
    color: "#e8f1f5",
  },
  title: { margin: "0 0 4px 0", fontSize: 20, fontWeight: 700 },
  sub: { margin: "0 0 18px 0", fontSize: 13, color: "#7d93a8" },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: {
    background: "#16283d",
    border: "1px solid #22394f",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#e8f1f5",
    fontSize: 14,
  },
  button: {
    background: "#5eead4",
    color: "#06201d",
    border: "none",
    borderRadius: 9,
    padding: "10px 12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  sentMsg: { fontSize: 13.5, lineHeight: 1.5 },
  errorMsg: { fontSize: 12.5, color: "#ff8552", marginTop: 10 },
};

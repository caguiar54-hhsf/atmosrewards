import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { installStorageShim } from "./lib/storageShim";
import SignIn from "./SignIn";
import AtmosTracker from "./AtmosTracker";

installStorageShim();

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1b2a", color: "#7d93a8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (!session) return <SignIn />;

  return (
    <div style={{ minHeight: "100vh", background: "#0d1b2a", padding: "24px 12px" }}>
      <AtmosTracker />
      <div style={{ maxWidth: 560, margin: "8px auto 0", textAlign: "right" }}>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: "none", border: "none", color: "#7d93a8", fontSize: 11.5, cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

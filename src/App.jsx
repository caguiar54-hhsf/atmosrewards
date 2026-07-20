import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { installStorageShim } from "./lib/storageShim";
import { deriveUser, updateProfile, changePassword, uploadAvatar } from "./lib/profile";
import Auth from "./Auth";
import AtmosTracker from "./AtmosTracker";

installStorageShim();

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [authMode, setAuthMode] = useState("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
      }
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0d1b2a",
          color: "#7d93a8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  // Show the reset-password screen if we're mid-recovery, even if a session already
  // exists (Supabase signs the recovery link into a session before the person sets a
  // new password).
  if (!session || authMode === "reset") {
    return <Auth mode={session && authMode === "reset" ? "reset" : "signin"} />;
  }

  const user = deriveUser(session);

  return (
    <AtmosTracker
      user={user}
      onSignOut={() => supabase.auth.signOut()}
      onUpdateProfile={(p) => updateProfile(p)}
      onChangePassword={(newPassword) => changePassword(newPassword)}
      onUploadAvatar={(file) => uploadAvatar(file)}
    />
  );
}

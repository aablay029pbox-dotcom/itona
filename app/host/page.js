"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function HostLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔐 ADMIN LOGIN (from admins table)
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .eq("password", password) // replace with hashed password in production
        .single();

      if (adminData) {
        // ✅ Generate a unique session token
        const sessionToken = crypto.randomUUID();

        // Save session token in Supabase
        await supabase
          .from("admins")
          .update({ current_session: sessionToken })
          .eq("id", adminData.id);

        // Save admin session in sessionStorage
        sessionStorage.setItem(
          "adminInfo",
          JSON.stringify({ id: adminData.id, username: adminData.username, current_session: sessionToken })
        );

        router.push("/admin");
        return;
      }

      // 🟡 NORMAL HOST LOGIN (Supabase)
      const { data: hostData, error: hostError } = await supabase
        .from("hosts")
        .select("*")
        .eq("username", username)
        .eq("password", password) // replace with hashed password in production
        .single();

      if (hostError || !hostData) {
        alert("Invalid username or password");
        setLoading(false);
        return;
      }

      // ✅ Generate a unique session token
      const hostSessionToken = crypto.randomUUID();

      // Save session token in Supabase
      await supabase
        .from("hosts")
        .update({ current_session: hostSessionToken })
        .eq("id", hostData.id);

      // Save host session in sessionStorage
      sessionStorage.setItem(
        "hostInfo",
        JSON.stringify({ id: hostData.id, username: hostData.username, current_session: hostSessionToken })
      );

      router.push("/host/dashboard");

    } catch (err) {
      console.error(err);
      alert("Login failed");
    }

    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header style={headerFooterStyle}>
        <h1>Host Login</h1>
      </header>
      <img 
        src="/left.png" 
        alt="Left"
        style={{
          position: "absolute",
          top: "10px",
          left: "13px",
          width: "55px",
          height: "55px",
          objectFit: "cover"
        }}
      />

      <img 
        src="/right.png" 
        alt="Right"
        style={{
          position: "absolute",
          top: "10px",
          right: "13px",
          width: "50px",
          height: "50px",
          objectFit: "cover"
        }}
      />

      <main style={mainStyle}>
        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            alignItems: "center"
          }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              width: "100%",
              maxWidth: "250px"
            }}
          >
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <button
              type="button"
              style={buttonStyle}
              onClick={() => router.push("/")}
            >
              Back
            </button>
          </div>
        </form>
      </main>

      <footer style={headerFooterStyle}>
        <p>© 2026</p>
      </footer>
    </div>
  );
}

// ------------------------
// Styles
// ------------------------

const headerFooterStyle = {
  backgroundColor: "#FFD700",
  padding: "20px",
  textAlign: "center"
};

const mainStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "15px",
  padding: "20px"
};

const inputStyle = {
  padding: "12px",
  width: "250px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const buttonStyle = {
  padding: "12px 30px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
  width: "100%"
};
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  // ============================
  // PROTECT ADMIN PAGE
  // ============================
  useEffect(() => {
    const adminInfo = sessionStorage.getItem("adminInfo");
    if (!adminInfo) {
      router.push("/host");
    }
  }, []);

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>Admin Panel</h1>
      </header>

      <main style={mainStyle}>
        {/* ================= MANAGE EVENTS ================= */}
        <div style={cardStyle}>
          <h2>Events</h2>
          <button
            style={buttonStyle}
            onClick={() => router.push("/admin/events")}
          >
            Manage Events
          </button>
        </div>

        {/* ================= ATTENDANCE ================= */}
        <div style={cardStyle}>
          <h2>Attendance</h2>
          <button
            style={buttonStyle}
            onClick={() => router.push("/admin/attendance")}
          >
            View Attendance
          </button>
        </div>

        {/* ================= HOSTS ================= */}
        <div style={cardStyle}>
          <h2>Hosts</h2>
          <button
            style={buttonStyle}
            onClick={() => router.push("/admin/host")}
          >
            Manage Hosts
          </button>
        </div>

        {/* ================= DASHBOARD ================= */}
        <button
          style={{ ...buttonStyle, backgroundColor: "#999" }}
          onClick={() => router.push("/host")}
        >
          Back to Dashboard
        </button>
      </main>

      <footer style={headerStyle}>
        <p>© 2026</p>
      </footer>
    </div>
  );
}

// ============================
// STYLES
// ============================
const containerStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#f7f7f7",
};

const headerStyle = {
  backgroundColor: "#FFD700",
  padding: "20px",
  textAlign: "center",
};

const mainStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  padding: "20px",
  alignItems: "center",
};

const cardStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const buttonStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
};
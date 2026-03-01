"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminHostsPage() {
  const router = useRouter();
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================
  // PROTECT PAGE
  // ============================
  useEffect(() => {
    const adminInfo = sessionStorage.getItem("adminInfo");
    if (!adminInfo) {
      router.push("/host");
    } else {
      fetchHosts();
    }
  }, []);

  // ============================
  // FETCH HOSTS
  // ============================
  const fetchHosts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("hosts").select("*");
    if (error) {
      console.error("Error fetching hosts:", error);
    } else {
      setHosts(data);
    }
    setLoading(false);
  };

  // ============================
  // DELETE HOST
  // ============================
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this host?")) return;
    const { error } = await supabase.from("hosts").delete().eq("id", id);
    if (error) {
      alert("Error deleting host: " + error.message);
    } else {
      fetchHosts();
    }
  };

  // ============================
  // TOGGLE ACTIVE STATUS
  // ============================
  const toggleActive = async (host) => {
    const { error } = await supabase
      .from("hosts")
      .update({ is_active: !host.is_active })
      .eq("id", host.id);
    if (error) {
      alert("Error updating host: " + error.message);
    } else {
      fetchHosts();
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>Manage Hosts</h1>
      </header>

      <main style={mainStyle}>
        {loading ? (
          <p>Loading hosts...</p>
        ) : (
          hosts.map((host) => (
            <div key={host.id} style={cardStyle}>
              <p>
                <strong>Username:</strong> {host.username}
              </p>
              <p>
                <strong>Active:</strong>{" "}
                {host.is_active ? "Yes" : "No"}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{ ...buttonStyle, backgroundColor: host.is_active ? "#999" : "#4caf50" }}
                  onClick={() => toggleActive(host)}
                >
                  {host.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  style={{ ...buttonStyle, backgroundColor: "#e74c3c" }}
                  onClick={() => handleDelete(host.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}

        {/* ================= BACK TO ADMIN BUTTON ================= */}
        <button
          style={{ ...buttonStyle, alignSelf: "center", marginTop: "30px" }}
          onClick={() => router.push("/admin")}
        >
          Back to Admin Panel
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
  gap: "10px",
};

const buttonStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
};
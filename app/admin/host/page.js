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
  // LIVE REFRESH EVERY 10 SECONDS
  // ============================
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHosts();
    }, 10000); // 10 seconds

    return () => clearInterval(interval); // cleanup
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
      // Sort: active hosts first
      const sortedHosts = data.sort((a, b) => {
        const aActive = a.current_session ? 1 : 0;
        const bActive = b.current_session ? 1 : 0;
        return bActive - aActive; // active (1) first
      });
      setHosts(sortedHosts);
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
  // FORCE LOGOUT (SET ACTIVE TO FALSE)
  // ============================
  const forceLogout = async (host) => {
    if (!confirm(`Force logout ${host.username}?`)) return;
    const { error } = await supabase
      .from("hosts")
      .update({ current_session: null })
      .eq("id", host.id);
    if (error) {
      alert("Error logging out host: " + error.message);
    } else {
      fetchHosts();
    }
  };

  // ============================
  // CHECK IF HOST IS ACTIVE
  // ============================
  const isHostActive = (host) => {
    return host.current_session ? true : false;
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>Manage Hosts</h1>
      </header>

      <main style={mainStyle}>
        {loading ? (
          <p>Loading hosts...</p>
        ) : hosts.length === 0 ? (
          <p>No hosts found.</p>
        ) : (
          hosts.map((host) => (
            <div key={host.id} style={cardStyle}>
              <p>
                <strong>Username:</strong> {host.username}
              </p>
              <p>
                <strong>Active:</strong> {isHostActive(host) ? "Yes" : "No"}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: isHostActive(host) ? "#e74c3c" : "#999",
                  }}
                  onClick={() => forceLogout(host)}
                  disabled={!isHostActive(host)}
                >
                  Force Logout
                </button>
                <button
                  style={{ ...buttonStyle, backgroundColor: "#4caf50" }}
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
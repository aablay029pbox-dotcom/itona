"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function HostDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyHost = async () => {
      const hostInfo = JSON.parse(sessionStorage.getItem("hostInfo"));

      if (!hostInfo?.id) {
        router.push("/host");
        return;
      }

      // Verify session with Supabase
      const { data: hostData, error } = await supabase
        .from("hosts")
        .select("current_session")
        .eq("id", hostInfo.id)
        .single();

      if (error || hostData?.current_session !== hostInfo.current_session) {
        // Session mismatch → force logout
        sessionStorage.removeItem("hostInfo");
        router.push("/host");
        return;
      }

      setLoading(false); // Host is verified
    };

    verifyHost();
  }, []);

  // ===========================
  // LOGOUT FUNCTION
  // ===========================
  const handleLogout = async () => {
    const hostInfo = JSON.parse(sessionStorage.getItem("hostInfo"));

    if (hostInfo?.id) {
      // Clear session in Supabase
      await supabase
        .from("hosts")
        .update({ current_session: null })
        .eq("id", hostInfo.id);
    }

    // Clear sessionStorage
    sessionStorage.removeItem("hostInfo");

    // Redirect to login
    router.push("/host");
  };

  if (loading) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      <header style={headerFooterStyle}>
        <h1>Host Dashboard</h1>
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
        <p>Welcome to the Host Dashboard</p>

        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "20px", 
          width: "100%", 
          maxWidth: "250px" 
        }}>
          
          <button onClick={() => router.push("/host/scan")} style={buttonStyle}>
            Scan QR Code
          </button>

          <button onClick={() => router.push("/host/attendance")} style={buttonStyle}>
            Attendance
          </button>

          <button onClick={handleLogout} style={buttonStyle}>
            Logout
          </button>
        </div>
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
  gap: "30px",
  padding: "20px"
};

const buttonStyle = {
  padding: "16px 40px",
  fontSize: "18px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
  width: "100%",
  textAlign: "center"
};
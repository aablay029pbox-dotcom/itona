"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HostDashboard() {
  const router = useRouter();

  useEffect(() => {
    const hostInfo = sessionStorage.getItem("hostInfo");

    if (!hostInfo) {
      router.push("/host");
    }
  }, []);

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

          <button
            onClick={() => {
              sessionStorage.removeItem("hostInfo");
              router.push("/host");
            }}
            style={buttonStyle}
          >
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

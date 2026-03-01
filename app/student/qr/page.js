"use client";

import QRCode from "react-qr-code";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function QRPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const data = localStorage.getItem("studentInfo");
    if (!data) {
      router.push("/student"); // redirect if not logged in
    } else {
      setStudent(JSON.parse(data));
    }
  }, [router]);

  if (!student) return null;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      {/* Header */}
      <header style={headerFooterStyle}>
        <h1>Your QR Code</h1>
        <img src="/left.png" alt="Left" style={cornerImageStyleLeft} />
        <img src="/right.png" alt="Right" style={cornerImageStyleRight} />
      </header>

      {/* Main */}
      <main style={mainStyle}>

        {/* QR Code Card */}
        <div style={qrCardStyle}>
          {/* QR now only encodes student ID */}
          <QRCode
            value={student.id}
            size={220}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>

        {/* Student Info */}
        <div style={{ textAlign: "center" }}>
          <p><strong>ID:</strong> {student.id}</p>
          <p><strong>Last Name:</strong> {student.lastname}</p>
          <p><strong>First Name:</strong> {student.firstname}</p>
          <p><strong>Course:</strong> {student.course}</p>
          <p><strong>Year & Section:</strong> {student.yearsection}</p>
        </div>

        <button onClick={() => router.push("/student")} style={buttonStyle}>
          Back to Home
        </button>
      </main>

      {/* Footer */}
      <footer style={headerFooterStyle}>
        <p>© 2026</p>
      </footer>

    </div>
  );
}

const headerFooterStyle = {
  backgroundColor: "#FFD700",
  padding: "20px",
  textAlign: "center",
  position: "relative"
};

const cornerImageStyleLeft = {
  position: "absolute",
  top: "10px",
  left: "15px",
  width: "55px",
  height: "55px",
  objectFit: "cover"
};

const cornerImageStyleRight = {
  position: "absolute",
  top: "10px",
  right: "15px",
  width: "55px",
  height: "55px",
  objectFit: "cover"
};

const mainStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "25px",
  padding: "20px"
};

const qrCardStyle = {
  backgroundColor: "white",
  padding: "25px",
  borderRadius: "15px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
};

const buttonStyle = {
  padding: "12px 30px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
  transition: "0.2s",
  marginTop: "10px"
};
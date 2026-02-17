"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      {/* Header */}
      <header style={{ backgroundColor: "#FFD700", padding: "20px", textAlign: "center" }}>
        <h1>Welcome</h1>
      </header>
      {/* Left Image */}
<img 
  src="/left.png" // JPG image in public folder
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

{/* Right Image */}
<img 
  src="/right.png" // JPG image in public folder
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

      {/* Main */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column", // 👈 THIS MAKES IT VERTICAL
        justifyContent: "center",
        alignItems: "center",
        gap: "20px"
      }}>
        <button
          onClick={() => router.push("/student")}
          style={buttonStyle}
        >
          Student
        </button>

        <button
          onClick={() => router.push("/host")}
          style={buttonStyle}
        >
          Host
        </button>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: "#FFD700", padding: "15px", textAlign: "center" }}>
        <p>© 2026</p>
      </footer>

    </div>
  );
}

const buttonStyle = {
  padding: "15px 40px",
  fontSize: "18px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
  width: "200px"
};

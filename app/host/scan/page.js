"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/library";
import { supabase } from "../../lib/supabase";

export default function ScanPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [popupType, setPopupType] = useState(null);
  const [popupMessage, setPopupMessage] = useState("");
  const [scannedStudent, setScannedStudent] = useState(null);

  const selectedEventRef = useRef(selectedEvent);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scanLockRef = useRef(false);

  // Keep selectedEvent ref updated
  useEffect(() => {
    selectedEventRef.current = selectedEvent;
  }, [selectedEvent]);

  // Initial setup
  useEffect(() => {
    const hostInfo = sessionStorage.getItem("hostInfo");
    if (!hostInfo) {
      router.push("/host");
      return;
    }

    fetchEvents();
    codeReaderRef.current = new BrowserMultiFormatReader();
    startScanner();

    const interval = setInterval(async () => {
      const hostInfo = JSON.parse(sessionStorage.getItem("hostInfo"));
      if (!hostInfo?.id) {
        clearInterval(interval);
        router.push("/host");
        return;
      }

      const { data: hostData, error } = await supabase
        .from("hosts")
        .select("current_session")
        .eq("id", hostInfo.id)
        .single();

      if (error || hostData?.current_session !== hostInfo.current_session) {
        sessionStorage.removeItem("hostInfo");
        clearInterval(interval);
        alert("You have been logged out by the admin.");
        router.push("/host");
      }
    }, 5000);

    return () => {
      if (codeReaderRef.current) codeReaderRef.current.reset();
      clearInterval(interval);
    };
  }, [router]);

  // Fetch events (only open ones)
  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*");
    const openEvents = (data || []).filter(evt => evt.is_open);
    setEvents(openEvents);
    if (openEvents.length > 0) setSelectedEvent(openEvents[0].id);
  };

  // Start QR scanner
  const startScanner = async () => {
    if (!videoRef.current) return;

    await codeReaderRef.current.decodeFromVideoDevice(
      null,
      videoRef.current,
      async (result, err) => {
        if (err && err.name !== "NotFoundException") console.error(err);
        if (result && !scanLockRef.current) {
          scanLockRef.current = true;
          await handleScan(result.getText());
        }
      }
    );
  };

  // Handle scanned QR (supports plain ID or JSON)
  const handleScan = async (scannedText) => {
    const eventId = selectedEventRef.current;
    if (!eventId) {
      showPopup("error", "Please select an open event first.");
      scanLockRef.current = false;
      return false;
    }

    let studentId = scannedText?.trim();

    // If scannedText looks like JSON, try to parse it
    if (studentId.startsWith("{") && studentId.endsWith("}")) {
      try {
        const data = JSON.parse(studentId);
        studentId = data.id?.trim();
      } catch {
        // Invalid JSON, continue with the plain text
      }
    }

    if (!studentId) {
      showPopup("error", "Invalid QR Code format.");
      scanLockRef.current = false;
      return false;
    }

    try {
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (!student) {
        showPopup("error", "Student not found.");
        scanLockRef.current = false;
        return false;
      }

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existing) {
        setScannedStudent(student);
        showPopup("already", "Student already attended this event.");
        scanLockRef.current = false;
        return false;
      }

      const { error } = await supabase.from("attendance").insert([
        { student_id: studentId, event_id: eventId },
      ]);

      if (error) throw error;

      setScannedStudent(student);
      showPopup("success", "Attendance successfully recorded.");
      scanLockRef.current = false;
      return true;
    } catch (err) {
      console.error(err);
      showPopup("error", "Failed to mark attendance.");
      scanLockRef.current = false;
      return false;
    }
  };

  // Popup helpers
  const showPopup = (type, message) => {
    setPopupType(type);
    setPopupMessage(message);
  };

  const closePopup = () => {
    setPopupType(null);
    setPopupMessage("");
    setScannedStudent(null);
    scanLockRef.current = false;
  };

  const getPopupColor = () => {
    if (popupType === "success") return "#28a745";
    if (popupType === "already") return "#ff9800";
    return "#dc3545";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header style={headerFooterStyle}>
        <h1>Scan QR Code</h1>
      </header>

      <main style={mainStyle}>
        {events.length > 0 ? (
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            style={dropdownStyle}
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>
        ) : (
          <p style={{ color: "#888" }}>No open events available.</p>
        )}

        <video
          ref={videoRef}
          style={{ width: "100%", maxWidth: "400px", borderRadius: "8px" }}
        />

        <button style={buttonStyle} onClick={() => router.push("/host/dashboard")}>
          Back to Dashboard
        </button>
      </main>

      <footer style={headerFooterStyle}>
        <p>© 2026</p>
      </footer>

      {popupType && (
        <div style={popupOverlay} onClick={closePopup}>
          <div style={{ ...popupBox, borderTop: `8px solid ${getPopupColor()}` }}>
            <h2 style={{ color: getPopupColor(), marginBottom: "15px" }}>{popupMessage}</h2>
            {scannedStudent && (
              <>
                <p><strong>Last Name:</strong> {scannedStudent.lastname}</p>
                <p><strong>First Name:</strong> {scannedStudent.firstname}</p>
                <p><strong>Course:</strong> {scannedStudent.course}</p>
                <p><strong>Section:</strong> {scannedStudent.yearsection}</p>
              </>
            )}
            <p style={{ marginTop: "15px", fontSize: "14px", color: "#888" }}>
              (Click anywhere to close)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Styles ---------------- */
const headerFooterStyle = {
  backgroundColor: "#FFD700",
  padding: "20px",
  textAlign: "center",
};

const mainStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "20px",
  padding: "20px",
};

const buttonStyle = {
  padding: "12px 30px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
  width: "180px",
};

const dropdownStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  width: "200px",
  fontSize: "16px",
};

const popupOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  cursor: "pointer",
};

const popupBox = {
  backgroundColor: "white",
  padding: "30px",
  borderRadius: "12px",
  textAlign: "center",
  width: "320px",
  boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
};
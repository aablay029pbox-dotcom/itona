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
  // "success" | "already" | "error"

  const [popupMessage, setPopupMessage] = useState("");
  const [scannedStudent, setScannedStudent] = useState(null);

  const selectedEventRef = useRef(selectedEvent);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scanLockRef = useRef(false);

  useEffect(() => {
    selectedEventRef.current = selectedEvent;
  }, [selectedEvent]);

  useEffect(() => {
    fetchEvents();
    codeReaderRef.current = new BrowserMultiFormatReader();
    startScanner();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*");
    setEvents(data || []);
    if (data && data.length > 0) setSelectedEvent(data[0].id);
  };

  const startScanner = async () => {
    if (!videoRef.current) return;

    await codeReaderRef.current.decodeFromVideoDevice(
      null,
      videoRef.current,
      async (result, err) => {
        if (err && err.name !== "NotFoundException") {
          console.error(err);
        }

        if (result && !scanLockRef.current) {
          const success = await handleScan(result.getText());

          if (success) {
            scanLockRef.current = true;
            setTimeout(() => {
              scanLockRef.current = false;
            }, 2000);
          }
        }
      }
    );
  };

  const handleScan = async (scannedText) => {
    const eventId = selectedEventRef.current;
    if (!eventId) {
      showPopup("error", "Please select an event first.");
      return false;
    }

    let studentId;
    try {
      const data = JSON.parse(scannedText);
      studentId = data.id?.trim();
      if (!studentId) throw new Error();
    } catch {
      showPopup("error", "Invalid QR Code format.");
      return false;
    }

    try {
      // Get student info
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (!student) {
        showPopup("error", "Student not found.");
        return false;
      }

      // Check if already attended
      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existing) {
        setScannedStudent(student);
        showPopup("already", "Student already attended this event.");
        return false;
      }

      // Insert attendance
      const { error } = await supabase.from("attendance").insert([
        { student_id: studentId, event_id: eventId },
      ]);

      if (error) throw error;

      setScannedStudent(student);
      showPopup("success", "Attendance successfully recorded.");
      return true;

    } catch (err) {
      console.error(err);
      showPopup("error", "Failed to mark attendance.");
      return false;
    }
  };

  const showPopup = (type, message) => {
    setPopupType(type);
    setPopupMessage(message);
  };

  const closePopup = () => {
    setPopupType(null);
    setPopupMessage("");
    setScannedStudent(null);
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
        {events.length > 0 && (
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

      {/* UNIVERSAL POPUP */}
      {popupType && (
        <div style={popupOverlay} onClick={closePopup}>
          <div style={{ ...popupBox, borderTop: `8px solid ${getPopupColor()}` }}>
            <h2 style={{ color: getPopupColor(), marginBottom: "15px" }}>
              {popupMessage}
            </h2>

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
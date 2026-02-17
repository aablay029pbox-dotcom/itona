"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/library";
import { supabase } from "../../lib/supabase";

export default function ScanPage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [recentScans, setRecentScans] = useState(new Set());
  const [selectedEvent, setSelectedEvent] = useState(""); // dropdown value
  const [events, setEvents] = useState([]); // events list

  const selectedEventRef = useRef(selectedEvent);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scanLockRef = useRef(false); // prevents multiple successful scans instantly

  // Keep the ref updated with the latest selected event
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

  // Fetch all events from the table
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from("events").select("*");
      if (error) throw error;

      setEvents(data || []);
      if (data && data.length > 0) setSelectedEvent(data[0].id); // default first event
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setMessage("❌ Failed to load events");
    }
  };

  const startScanner = async () => {
    if (!videoRef.current) return;

    try {
      await codeReaderRef.current.decodeFromVideoDevice(
        null,
        videoRef.current,
        async (result, err) => {
          if (err && err.name !== "NotFoundException") {
            console.error(err);
          }

          if (result && !scanLockRef.current) {
            const scannedText = result.getText();

            // Only lock after a successful scan
            const success = await handleScan(scannedText);
            if (success) {
              scanLockRef.current = true;
              setTimeout(() => {
                scanLockRef.current = false;
              }, 2000);
            }
          }
        }
      );
    } catch (err) {
      console.error("Scanner init error:", err);
      setMessage("Failed to start scanner. Check camera permissions.");
    }
  };

  const handleScan = async (scannedText) => {
    if (!scannedText) return false;

    const eventId = selectedEventRef.current;
    if (!eventId) {
      setMessage("Please select an event before scanning!");
      return false;
    }

    let studentId;
    try {
      const data = JSON.parse(scannedText);
      studentId = data.id?.trim();
      if (!studentId) throw new Error("No ID found in QR");
    } catch {
      setMessage("❌ Invalid QR code format. Try again.");
      return false;
    }

    if (recentScans.has(studentId)) {
      setMessage(`⚠️ Already scanned: ${studentId}`);
      return false;
    }

    // Temporarily mark to prevent duplicates
    setRecentScans((prev) => new Set(prev).add(studentId));
    setTimeout(() => {
      setRecentScans((prev) => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }, 5000);

    try {
      const { data: existing, error: checkError } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        setMessage(`⚠️ Student ID ${studentId} already marked for this event!`);
        return false;
      }

      const { error } = await supabase.from("attendance").insert([
        { student_id: studentId, event_id: eventId },
      ]);
      if (error) throw error;

      setMessage(`✅ Attendance marked for Student ID: ${studentId}`);
      return true; // success
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to mark attendance. Try again.");
      return false;
    }
  };

  // Retry handler
  const handleRetry = () => {
    setMessage(""); // clear message
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header style={headerFooterStyle}>
        <h1>Scan QR Code</h1>
      </header>

      <main style={mainStyle}>
        <p>{message}</p>

        {/* Event dropdown */}
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
          style={{
            width: "100%",
            maxWidth: "400px",
            borderRadius: "8px",
          }}
        />

        {/* Retry Button */}
        <button style={retryButtonStyle} onClick={handleRetry}>
          Retry Scan
        </button>

        <button style={buttonStyle} onClick={() => router.push("/host/dashboard")}>
          Back to Dashboard
        </button>
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

const retryButtonStyle = {
  padding: "10px 25px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#00aaff",
  color: "white",
  cursor: "pointer",
  width: "150px",
};

const dropdownStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  width: "200px",
  fontSize: "16px",
};

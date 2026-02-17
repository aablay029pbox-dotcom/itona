"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function AttendancePage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(""); 
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState({ course: "", yearSection: "" });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchAttendance(selectedEvent);
    }
  }, [selectedEvent]);

  // Fetch all events
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from("events").select("*");
      if (error) throw error;
      setEvents(data || []);
      if (data && data.length > 0) setSelectedEvent(data[0].id);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  // Fetch attendance and student info manually
  const fetchAttendance = async (eventId) => {
    try {
      // Step 1: fetch attendance for the event
      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .eq("event_id", eventId);
      if (attError) throw attError;

      if (!attendanceData || attendanceData.length === 0) {
        setRecords([]);
        return;
      }

      // Step 2: fetch students for the attendance
      const studentIds = attendanceData.map(a => a.student_id);
      const { data: studentsData, error: stuError } = await supabase
        .from("students")
        .select("*")
        .in("id", studentIds);
      if (stuError) throw stuError;

      // Step 3: combine attendance with student info
      const combinedRecords = attendanceData.map(a => {
        const student = studentsData.find(s => s.id === a.student_id);
        return {
          ...a,
          student_id: student,   // student info
          scannedAt: a.created_at // timestamp
        };
      });

      // Sort by lastname → course → yearsection
      combinedRecords.sort((a, b) => {
        if (a.student_id.lastname !== b.student_id.lastname)
          return a.student_id.lastname.localeCompare(b.student_id.lastname);
        if (a.student_id.course !== b.student_id.course)
          return a.student_id.course.localeCompare(b.student_id.course);
        return a.student_id.yearsection.localeCompare(b.student_id.yearsection);
      });

      setRecords(combinedRecords);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    }
  };

  // Dynamic filter options based on current records
  const uniqueCourses = [...new Set(records.map(r => r.student_id.course))];
  const uniqueYearSections = [...new Set(records.map(r => r.student_id.yearsection))];

  const filteredRecords = records.filter(r => {
    return (
      (!filter.course || r.student_id.course === filter.course) &&
      (!filter.yearSection || r.student_id.yearsection === filter.yearSection)
    );
  });

  const currentEventName = events.find(e => e.id === selectedEvent)?.name || "";

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`Attendance Records - ${currentEventName}`, 14, 20);
    doc.autoTable({
      head: [["Last Name", "First Name", "Course", "YearSection", "Event", "Scanned At"]],
      body: filteredRecords.map(r => [
        r.student_id.lastname,
        r.student_id.firstname,
        r.student_id.course,
        r.student_id.yearsection,
        currentEventName,
        new Date(r.scannedAt).toLocaleString()
      ]),
      startY: 30
    });
    doc.save("attendance.pdf");
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredRecords.map(r => ({
        Lastname: r.student_id.lastname,
        Firstname: r.student_id.firstname,
        Course: r.student_id.course,
        YearSection: r.student_id.yearsection,
        Event: currentEventName,
        ScannedAt: new Date(r.scannedAt).toLocaleString()
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance.xlsx");
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>Attendance Records</h1>
      </header>

      <main style={mainStyle}>
        {/* Event & Filter Section */}
        <div style={filterContainerStyle}>
          {/* Event Dropdown */}
          <select
            value={selectedEvent}
            onChange={e => setSelectedEvent(e.target.value)}
            style={dropdownStyle}
          >
            {events.map(evt => (
              <option key={evt.id} value={evt.id}>{evt.name}</option>
            ))}
          </select>

          {/* Dynamic Course Filter */}
          <select
            value={filter.course}
            onChange={e => setFilter({ ...filter, course: e.target.value })}
            style={dropdownStyle}
          >
            <option value="">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          {/* Dynamic YearSection Filter */}
          <select
            value={filter.yearSection}
            onChange={e => setFilter({ ...filter, yearSection: e.target.value })}
            style={dropdownStyle}
          >
            <option value="">All YearSections</option>
            {uniqueYearSections.map(ys => (
              <option key={ys} value={ys}>{ys}</option>
            ))}
          </select>
        </div>

        {/* Download & Back Buttons */}
        <div style={buttonContainerStyle}>
          <button style={buttonStyle} onClick={downloadPDF}>Download PDF</button>
          <button style={buttonStyle} onClick={downloadExcel}>Download Excel</button>
          <button style={buttonStyle} onClick={() => router.push("/host/dashboard")}>Back</button>
        </div>

        {/* Attendance List */}
        {filteredRecords.length === 0 ? (
          <p style={{ fontSize: "16px", textAlign: "center" }}>No attendance records.</p>
        ) : (
          <div style={listContainerStyle}>
            {filteredRecords.map(r => (
              <div key={r.id} style={recordStyle}>
                <div>
                  <strong style={{ fontSize: "16px" }}>
                    {r.student_id.lastname}, {r.student_id.firstname}
                  </strong>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    Event: {currentEventName} | {r.student_id.course} - {r.student_id.yearsection}
                  </p>
                </div>
                <div style={{ fontSize: "14px" }}>
                  {new Date(r.scannedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={footerStyle}>
        <p>© 2026</p>
      </footer>
    </div>
  );
}

// ------------------------
// Styles
// ------------------------
const containerStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  fontFamily: "Arial, sans-serif",
  backgroundColor: "#f7f7f7",
  padding: "0 10px"
};

const headerStyle = {
  backgroundColor: "#FFD700",
  padding: "15px",
  textAlign: "center",
  position: "sticky",
  top: 0,
  zIndex: 10
};

const footerStyle = {
  backgroundColor: "#FFD700",
  padding: "10px",
  textAlign: "center",
  position: "sticky",
  bottom: 0
};

const mainStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "15px",
  padding: "15px"
};

const filterContainerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  justifyContent: "center",
  width: "100%"
};

const dropdownStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "16px",
  minWidth: "120px",
  flexGrow: 1,
  maxWidth: "200px"
};

const buttonContainerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  justifyContent: "center"
};

const buttonStyle = {
  padding: "12px 20px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
  minWidth: "120px"
};

const listContainerStyle = {
  width: "100%",
  maxWidth: "700px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  overflowY: "auto",
  maxHeight: "60vh",
  paddingBottom: "10px"
};

const recordStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px",
  backgroundColor: "white",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  flexWrap: "wrap"
};

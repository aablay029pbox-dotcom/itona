"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ Correct import
import * as XLSX from "xlsx";

export default function AttendancePage() {
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [records, setRecords] = useState([]);

  const [filter, setFilter] = useState({
    course: "",
    yearSection: ""
  });

  const [downloadMode, setDownloadMode] = useState("all"); // all, course, yearSection, both

  useEffect(() => {
    fetchEventsAndAttendance();
  }, []);

  const fetchEventsAndAttendance = async () => {
    try {
      // 1️⃣ Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*");
      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // 2️⃣ Fetch all attendance
      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select("*");
      if (attError) throw attError;

      if (!attendanceData || attendanceData.length === 0) {
        setRecords([]);
        return;
      }

      const studentIds = [...new Set(attendanceData.map(a => a.student_id))];

      // 3️⃣ Fetch students
      const { data: studentsData, error: stuError } = await supabase
        .from("students")
        .select("*")
        .in("id", studentIds);
      if (stuError) throw stuError;

      // 4️⃣ Group attendance per student
      const grouped = studentsData.map(student => {
        const studentAttendance = attendanceData.filter(
          a => a.student_id === student.id
        );

        return {
          ...student,
          events: studentAttendance.map(a => a.event_id)
        };
      });

      grouped.sort((a, b) => a.lastname.localeCompare(b.lastname));
      setRecords(grouped);

    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  // ============================
  // FILTER LOGIC
  // ============================
  const uniqueCourses = [...new Set(records.map(r => r.course))];
  const uniqueYearSections = [...new Set(records.map(r => r.yearsection))];

  const filteredRecords = records.filter(r =>
    (!filter.course || r.course === filter.course) &&
    (!filter.yearSection || r.yearsection === filter.yearSection)
  );

  // ============================
  // DOWNLOAD DATA HELPER
  // ============================
  const getDownloadData = () => {
    switch (downloadMode) {
      case "all":
        return records;
      case "course":
        return filter.course ? records.filter(r => r.course === filter.course) : [];
      case "yearSection":
        return filter.yearSection ? records.filter(r => r.yearsection === filter.yearSection) : [];
      case "both":
        return (filter.course && filter.yearSection)
          ? records.filter(r => r.course === filter.course && r.yearsection === filter.yearSection)
          : [];
      default:
        return records;
    }
  };

  // ============================
  // PDF EXPORT
  // ============================
  const downloadPDF = () => {
    const exportData = getDownloadData();

    if (exportData.length === 0) {
      alert("No records to export with current selection.");
      return;
    }

    const doc = new jsPDF();
    const tableHead = [
      ["Last Name", "First Name", "Course", "YearSection", "Total", ...events.map(evt => evt.name)]
    ];

    const tableBody = exportData.map(student => [
      student.lastname,
      student.firstname,
      student.course,
      student.yearsection,
      student.events.length,
      ...events.map(evt => student.events.includes(evt.id) ? "✔" : "")
    ]);

    doc.text("Attendance Records", 14, 20);
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 30
    });

    doc.save("attendance.pdf");
  };

  // ============================
  // EXCEL EXPORT
  // ============================
  const downloadExcel = () => {
    const exportData = getDownloadData();

    if (exportData.length === 0) {
      alert("No records to export with current selection.");
      return;
    }

    const dataForExcel = exportData.map(student => {
      const eventChecklist = {};
      events.forEach(evt => {
        eventChecklist[evt.name] = student.events.includes(evt.id) ? "✔" : "";
      });

      return {
        Lastname: student.lastname,
        Firstname: student.firstname,
        Course: student.course,
        YearSection: student.yearsection,
        TotalEventsAttended: student.events.length,
        ...eventChecklist
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
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

        {/* FILTER + DOWNLOAD MODE */}
        <div style={filterContainerStyle}>
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

          <select
            value={filter.yearSection}
            onChange={e =>
              setFilter({ ...filter, yearSection: e.target.value })
            }
            style={dropdownStyle}
          >
            <option value="">All YearSections</option>
            {uniqueYearSections.map(ys => (
              <option key={ys} value={ys}>{ys}</option>
            ))}
          </select>

          <select
            value={downloadMode}
            onChange={e => setDownloadMode(e.target.value)}
            style={dropdownStyle}
          >
            <option value="all">Download All</option>
            <option value="course">By Course</option>
            <option value="yearSection">By YearSection</option>
            <option value="both">By Course + YearSection</option>
          </select>
        </div>

        {/* BUTTONS */}
        <div style={buttonContainerStyle}>
          <button style={buttonStyle} onClick={downloadPDF}>
            Download PDF
          </button>
          <button style={buttonStyle} onClick={downloadExcel}>
            Download Excel
          </button>
          <button
            style={buttonStyle}
            onClick={() => router.push("/host/dashboard")}
          >
            Back
          </button>
        </div>

        {/* STUDENT LIST */}
        {filteredRecords.length === 0 ? (
          <p>No attendance records.</p>
        ) : (
          <div style={listContainerStyle}>
            {filteredRecords.map(student => (
              <div key={student.id} style={recordStyle}>
                <div>
                  <strong>
                    {student.lastname}, {student.firstname}
                  </strong>
                  <p style={{ margin: 0 }}>
                    {student.course} - {student.yearsection}
                  </p>
                </div>

                <div style={checklistStyle}>
                  {events.map(evt => (
                    <label key={evt.id}>
                      <input
                        type="checkbox"
                        checked={student.events.includes(evt.id)}
                        readOnly
                      />{" "}
                      {evt.name}
                    </label>
                  ))}
                </div>

                <div style={{ fontWeight: "bold" }}>
                  Total: {student.events.length}
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

// ============================
// STYLES
// ============================

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
  textAlign: "center"
};

const footerStyle = {
  backgroundColor: "#FFD700",
  padding: "10px",
  textAlign: "center"
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
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "center"
};

const dropdownStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px"
};

const buttonContainerStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "center"
};

const buttonStyle = {
  padding: "12px 20px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer"
};

const listContainerStyle = {
  width: "100%",
  maxWidth: "900px",
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const recordStyle = {
  backgroundColor: "white",
  padding: "15px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  gap: "8px"
};

const checklistStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "15px"
};

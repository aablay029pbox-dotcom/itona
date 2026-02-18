"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const PAGE_SIZE = 50;

export default function AttendancePage() {
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState({
    course: "",
    yearSection: ""
  });

  const [downloadMode, setDownloadMode] = useState("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [filter, page]);

  // ============================
  // FETCH EVENTS
  // ============================
  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("id");

    if (!error) setEvents(data || []);
  };

  // ============================
  // FETCH ATTENDANCE (OPTIMIZED)
  // ============================
  const fetchAttendance = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("students")
        .select("*")
        .order("lastname")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filter.course) query = query.eq("course", filter.course);
      if (filter.yearSection)
        query = query.eq("yearsection", filter.yearSection);

      const { data: students, error } = await query;
      if (error) throw error;

      if (!students || students.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .in("student_id", studentIds);

      if (attError) throw attError;

      const attendanceMap = new Map();

      attendanceData.forEach(a => {
        if (!attendanceMap.has(a.student_id)) {
          attendanceMap.set(a.student_id, []);
        }
        attendanceMap.get(a.student_id).push(a.event_id);
      });

      const grouped = students.map(student => ({
        ...student,
        events: attendanceMap.get(student.id) || []
      }));

      setRecords(grouped);
    } catch (err) {
      console.error("Fetch error:", err);
    }

    setLoading(false);
  };

  // ============================
  // DOWNLOAD HELPER
  // ============================
  const getDownloadData = () => records;

  // ============================
  // PDF EXPORT
  // ============================
  const downloadPDF = () => {
    if (records.length === 0) {
      alert("No records to export.");
      return;
    }

    const doc = new jsPDF();

    const tableHead = [
      ["Last Name", "First Name", "Course", "YearSection", "Total", ...events.map(evt => evt.name)]
    ];

    const tableBody = records.map(student => [
      student.lastname,
      student.firstname,
      student.course,
      student.yearsection,
      student.events.length,
      ...events.map(evt =>
        student.events.includes(evt.id) ? "✔" : ""
      )
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
    if (records.length === 0) {
      alert("No records to export.");
      return;
    }

    const dataForExcel = records.map(student => {
      const eventChecklist = {};
      events.forEach(evt => {
        eventChecklist[evt.name] =
          student.events.includes(evt.id) ? "✔" : "";
      });

      return {
        Lastname: student.lastname,
        Firstname: student.firstname,
        Course: student.course,
        YearSection: student.yearsection,
        TotalEvents: student.events.length,
        ...eventChecklist
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance.xlsx");
  };

  // Unique Filters
  const uniqueCourses = [...new Set(records.map(r => r.course))];
  const uniqueYearSections = [...new Set(records.map(r => r.yearsection))];

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>Attendance Records</h1>
      </header>

      {/* Left Image */}
      <img
        src="/left.png"
        alt="Left"
        style={leftImageStyle}
      />

      {/* Right Image */}
      <img
        src="/right.png"
        alt="Right"
        style={rightImageStyle}
      />

      <main style={mainStyle}>

        {/* FILTERS */}
        <div style={filterContainerStyle}>
          <select
            value={filter.course}
            onChange={e => {
              setPage(0);
              setFilter({ ...filter, course: e.target.value });
            }}
            style={dropdownStyle}
          >
            <option value="">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          <select
            value={filter.yearSection}
            onChange={e => {
              setPage(0);
              setFilter({ ...filter, yearSection: e.target.value });
            }}
            style={dropdownStyle}
          >
            <option value="">All YearSections</option>
            {uniqueYearSections.map(ys => (
              <option key={ys} value={ys}>{ys}</option>
            ))}
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
        {loading ? (
          <p>Loading...</p>
        ) : records.length === 0 ? (
          <p>No attendance records.</p>
        ) : (
          <div style={listContainerStyle}>
            {records.map(student => (
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
// STYLES (Same as your first)
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
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  fontSize: "16px",
  color: "#000000"
};

const checklistStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "15px"
};

const leftImageStyle = {
  position: "absolute",
  top: "3px",
  left: "13px",
  width: "55px",
  height: "55px",
  objectFit: "cover"
};

const rightImageStyle = {
  position: "absolute",
  top: "3px",
  right: "13px",
  width: "50px",
  height: "50px",
  objectFit: "cover"
};

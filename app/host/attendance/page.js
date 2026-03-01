"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 50;
const DOWNLOAD_LIMIT = 60;

export default function AttendancePage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [records, setRecords] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ course: "", yearSection: "" });

  // ============================
  // HOST PROTECTION + LIVE SESSION CHECK
  // ============================
  useEffect(() => {
    const hostInfo = sessionStorage.getItem("hostInfo");
    if (!hostInfo) {
      router.push("/host");
      return;
    }

    fetchEvents();
    fetchAllStudents();

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
    }, 5000); // check every 5 seconds

    return () => clearInterval(interval);
  }, [router]);

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
  // FETCH ALL STUDENTS
  // ============================
  const fetchAllStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, course, yearsection");
    if (data) setAllStudents(data);
  };

  // ============================
  // FETCH ATTENDANCE (PAGINATED)
  // ============================
  useEffect(() => {
    fetchAttendance();
  }, [filter, page]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("students")
        .select("*")
        .order("lastname", { ascending: true })
        .order("firstname", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filter.course) query = query.eq("course", filter.course);
      if (filter.yearSection) query = query.eq("yearsection", filter.yearSection);

      const { data: students, error } = await query;
      if (error) throw error;
      if (!students || students.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const studentIds = students.map((s) => s.id);

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .in("student_id", studentIds);

      const attendanceMap = new Map();
      attendanceData?.forEach((a) => {
        if (!attendanceMap.has(a.student_id)) attendanceMap.set(a.student_id, []);
        attendanceMap.get(a.student_id).push(a.event_id);
      });

      const merged = students
        .map((s) => ({ ...s, events: attendanceMap.get(s.id) || [] }))
        .sort((a, b) => {
          const lastCmp = a.lastname.localeCompare(b.lastname);
          if (lastCmp !== 0) return lastCmp;
          return a.firstname.localeCompare(b.firstname);
        });

      setRecords(merged);
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  // ============================
  // FETCH FOR PDF (LIMIT 60)
  // ============================
  const fetchAllForDownload = async () => {
    try {
      let query = supabase
        .from("students")
        .select("*")
        .order("lastname", { ascending: true })
        .order("firstname", { ascending: true })
        .limit(DOWNLOAD_LIMIT);

      if (filter.course) query = query.eq("course", filter.course);
      if (filter.yearSection) query = query.eq("yearsection", filter.yearSection);

      const { data: students, error } = await query;
      if (error) throw error;
      if (!students || students.length === 0) return [];

      const studentIds = students.map((s) => s.id);

      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .in("student_id", studentIds);

      if (attError) throw attError;

      const attendanceMap = new Map();
      attendanceData?.forEach((a) => {
        if (!attendanceMap.has(a.student_id)) attendanceMap.set(a.student_id, []);
        attendanceMap.get(a.student_id).push(a.event_id);
      });

      return students
        .map((s) => ({ ...s, events: attendanceMap.get(s.id) || [] }))
        .sort((a, b) => {
          const lastCmp = a.lastname.localeCompare(b.lastname);
          if (lastCmp !== 0) return lastCmp;
          return a.firstname.localeCompare(b.firstname);
        });
    } catch (err) {
      console.error("Download fetch error:", err);
      return [];
    }
  };

  // ============================
  // DOWNLOAD PDF
  // ============================
  const downloadPDF = async () => {
    if (events.length === 0) {
      alert("Events not loaded yet.");
      return;
    }

    const allRecords = await fetchAllForDownload();
    if (allRecords.length === 0) {
      alert("No records to export.");
      return;
    }

    const doc = new jsPDF("l", "pt", "a4");

    const tableHead = [[
      "Last Name",
      "First Name",
      "Course",
      "YearSection",
      "Total",
      ...events.map((evt) => evt.name),
    ]];

    const tableBody = allRecords.map((student) => [
      student.lastname,
      student.firstname,
      student.course,
      student.yearsection,
      student.events.length,
      ...events.map((evt) => (student.events.includes(evt.id) ? "Attended" : "")),
    ]);

    doc.setFontSize(14);
    doc.text(`Attendance Records (Showing ${allRecords.length} students)`, 40, 40);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 60,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [255, 215, 0] },
      margin: { left: 20, right: 20 },
      tableWidth: "auto",
    });

    const coursePart = filter.course ? filter.course.replace(/\s+/g, "_") : "AllCourses";
    const yearSectionPart = filter.yearSection ? filter.yearSection.replace(/\s+/g, "_") : "AllYearSections";
    const fileName = `Attendance_${coursePart}_${yearSectionPart}.pdf`;

    doc.save(fileName);
  };

  // ============================
  // FILTER OPTIONS
  // ============================
  const uniqueCourses = [...new Set(allStudents.map((s) => s.course))].sort((a, b) => a.localeCompare(b));
  const uniqueYearSections = [...new Set(
    allStudents
      .filter(s => !filter.course || s.course === filter.course)
      .map(s => s.yearsection)
  )].sort((a, b) => a.localeCompare(b));

  // ============================
  // STYLES
  // ============================
  const containerStyle = { display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Arial, sans-serif", backgroundColor: "#f7f7f7", padding: "0 10px" };
  const headerStyle = { backgroundColor: "#FFD700", padding: "15px", textAlign: "center" };
  const footerStyle = { backgroundColor: "#FFD700", padding: "10px", textAlign: "center" };
  const mainStyle = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "15px", padding: "15px" };
  const filterContainerStyle = { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" };
  const dropdownStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" };
  const buttonContainerStyle = { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" };
  const buttonStyle = { padding: "12px 20px", fontSize: "16px", borderRadius: "8px", border: "none", backgroundColor: "#f4b400", color: "white", cursor: "pointer" };
  const listContainerStyle = { width: "100%", maxWidth: "900px", display: "flex", flexDirection: "column", gap: "10px" };
  const recordStyle = { backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "12px", fontSize: "16px", color: "#000" };
  const checklistStyle = { display: "flex", flexWrap: "wrap", gap: "8px" };
  const badgeStyle = (attended) => ({ padding: "6px 12px", borderRadius: "20px", backgroundColor: attended ? "#f4b400" : "#ccc", color: attended ? "white" : "#555", fontWeight: "500", fontSize: "14px" });
  const paginationStyle = { display: "flex", gap: "10px", justifyContent: "center", alignItems: "center", marginTop: "15px" };

  // ============================
  // RENDER
  // ============================
  return (
    <div style={containerStyle}>
      <header style={headerStyle}><h1>Attendance Records</h1></header>

      <main style={mainStyle}>
        <div style={filterContainerStyle}>
          <select
            value={filter.course}
            onChange={(e) => setFilter({ ...filter, course: e.target.value, yearSection: "" })}
            style={dropdownStyle}
          >
            <option value="">All Courses</option>
            {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filter.yearSection}
            onChange={(e) => setFilter({ ...filter, yearSection: e.target.value })}
            style={dropdownStyle}
          >
            <option value="">All YearSections</option>
            {uniqueYearSections.map(ys => <option key={ys} value={ys}>{ys}</option>)}
          </select>
        </div>

        <div style={buttonContainerStyle}>
          <button style={buttonStyle} onClick={downloadPDF}>Download PDF</button>
          <button style={buttonStyle} onClick={() => router.push("/host/dashboard")}>Back</button>
        </div>

        {loading ? <p>Loading...</p> : records.length === 0 ? <p>No attendance records.</p> : (
          <div style={listContainerStyle}>
            {records.map(student => (
              <div key={student.id} style={recordStyle}>
                <div>
                  <strong>{student.lastname}, {student.firstname}</strong>
                  <p style={{ margin: 0 }}>{student.course} - {student.yearsection}</p>
                </div>
                <div style={checklistStyle}>
                  {events.map(evt => <span key={evt.id} style={badgeStyle(student.events.includes(evt.id))}>{evt.name}</span>)}
                </div>
                <div style={{ fontWeight: "bold" }}>Total: {student.events.length}</div>
              </div>
            ))}

            <div style={paginationStyle}>
              <button style={buttonStyle} onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}>Previous</button>
              <span>Page {page + 1}</span>
              <button style={buttonStyle} onClick={() => records.length === PAGE_SIZE && setPage(p => p + 1)} disabled={records.length < PAGE_SIZE}>Next</button>
            </div>
          </div>
        )}
      </main>

      <footer style={footerStyle}><p>© 2026</p></footer>
    </div>
  );
}
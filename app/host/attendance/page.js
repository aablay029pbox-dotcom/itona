"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const PAGE_SIZE = 50;        // Pagination page size
const DOWNLOAD_LIMIT = 100;  // Max rows to download

export default function AttendancePage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ course: "", yearSection: "" });

  // ============================
  // FETCH EVENTS
  // ============================
  useEffect(() => {
    const fetchData = async () => {
      await fetchEvents();
    };
    fetchData();
  }, []);

  // ============================
  // FETCH ATTENDANCE
  // ============================
  useEffect(() => {
    const fetchData = async () => {
      await fetchAttendance();
    };
    fetchData();
  }, [filter, page]);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*").order("id");
    if (!error) setEvents(data || []);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let query = supabase.from("students").select("*").order("lastname")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filter.course) query = query.eq("course", filter.course);
      if (filter.yearSection) query = query.eq("yearsection", filter.yearSection);

      const { data: students, error } = await query;
      if (error) throw error;
      if (!students || students.length === 0) { setRecords([]); setLoading(false); return; }

      const studentIds = students.map(s => s.id);
      const { data: attendanceData, error: attError } = await supabase
        .from("attendance").select("*").in("student_id", studentIds);
      if (attError) throw attError;

      const attendanceMap = new Map();
      attendanceData.forEach(a => {
        if (!attendanceMap.has(a.student_id)) attendanceMap.set(a.student_id, []);
        if (a.event_id) attendanceMap.get(a.student_id).push(a.event_id);
      });

      setRecords(students.map(s => ({ ...s, events: attendanceMap.get(s.id) || [] })));
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  // ============================
  // DELETE SINGLE STUDENT
  // ============================
  const deleteStudent = async (studentId) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const { error } = await supabase.from("students").delete().eq("id", studentId);
      if (error) throw error;
      alert("Student deleted successfully!");
      fetchAttendance();
    } catch (err) {
      console.error(err);
      alert("Failed to delete students.");
    }
  };

  // ============================
  // SAFE DELETE (Zero attendance)
  // ============================
  const deleteStudentsWithoutValidEvents = async () => {
    if (!confirm("Delete students with ZERO valid events?")) return;
    try {
      const { error } = await supabase.rpc("delete_students_without_valid_events");
      if (error) throw error;
      alert("Cleanup complete!");
      fetchAttendance();
    } catch (err) {
      console.error(err);
      alert("Failed to delete students.");
    }
  };

  // ============================
  // FETCH DATA FOR DOWNLOAD
  // ============================
  const fetchAllForDownload = async () => {
    try {
      let query = supabase.from("students").select("*").order("lastname").limit(DOWNLOAD_LIMIT);
      if (filter.course) query = query.eq("course", filter.course);
      if (filter.yearSection) query = query.eq("yearsection", filter.yearSection);

      const { data: students, error } = await query;
      if (error) throw error;
      if (!students || students.length === 0) return [];

      const studentIds = students.map(s => s.id);
      const { data: attendanceData, error: attError } = await supabase
        .from("attendance").select("*").in("student_id", studentIds);
      if (attError) throw attError;

      const attendanceMap = new Map();
      attendanceData.forEach(a => {
        if (!attendanceMap.has(a.student_id)) attendanceMap.set(a.student_id, []);
        if (a.event_id) attendanceMap.get(a.student_id).push(a.event_id);
      });

      return students.map(s => ({ ...s, events: attendanceMap.get(s.id) || [] }));
    } catch (err) {
      console.error("Download fetch error:", err);
      return [];
    }
  };

  // ============================
  // DOWNLOAD PDF (Portrait)
  // ============================
  const downloadPDF = async () => {
    const allRecords = await fetchAllForDownload();
    if (allRecords.length === 0) { alert("No records to export."); return; }

    const doc = new jsPDF("l", "pt", "a4"); // "l" = landscape, "pt" = points, "a4" = page size
    const tableHead = [["Last Name","First Name","Course","YearSection","Total", ...events.map(evt=>evt.name)]];
    const tableBody = allRecords.map(student => [
      student.lastname, student.firstname, student.course, student.yearsection,
      student.events.length, ...events.map(evt => student.events.includes(evt.id) ? "attended" : "")
    ]);

    doc.setFontSize(14);
    doc.text("Attendance Records", 40, 40);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 60,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [255, 215, 0] },
      margin: { left: 20, right: 20 },
      tableWidth: "auto"
    });

    doc.save("attendance.pdf");
  };

  // ============================
  // DOWNLOAD EXCEL
  // ============================
  const downloadExcel = async () => {
    const allRecords = await fetchAllForDownload();
    if (allRecords.length === 0) { alert("No records to export."); return; }

    const dataForExcel = allRecords.map(student => {
      const eventChecklist = {};
      events.forEach(evt => { eventChecklist[evt.name] = student.events.includes(evt.id) ? "✔" : ""; });
      return { Lastname: student.lastname, Firstname: student.firstname, Course: student.course, YearSection: student.yearsection, TotalEvents: student.events.length, ...eventChecklist };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance.xlsx");
  };

  const uniqueCourses = [...new Set(records.map(r=>r.course))];
  const uniqueYearSections = [...new Set(records.map(r=>r.yearsection))];

  return (
    <div style={containerStyle}>
      <header style={headerStyle}><h1>Attendance Records</h1></header>
      <main style={mainStyle}>

        <div style={filterContainerStyle}>
          <select value={filter.course} onChange={e=>{setPage(0);setFilter({...filter,course:e.target.value})}} style={dropdownStyle}>
            <option value="">All Courses</option>
            {uniqueCourses.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filter.yearSection} onChange={e=>{setPage(0);setFilter({...filter,yearSection:e.target.value})}} style={dropdownStyle}>
            <option value="">All YearSections</option>
            {uniqueYearSections.map(ys => <option key={ys} value={ys}>{ys}</option>)}
          </select>
        </div>

        <div style={buttonContainerStyle}>
          <button style={buttonStyle} onClick={downloadPDF}>Download PDF</button>
          <button style={buttonStyle} onClick={downloadExcel}>Download Excel</button>
          <button style={{...buttonStyle, backgroundColor:"#b52b27"}} onClick={deleteStudentsWithoutValidEvents}>Delete Zero Attendance</button>
          <button style={buttonStyle} onClick={()=>router.push("/host/dashboard")}>Back</button>
        </div>

        {loading ? <p>Loading...</p> : records.length===0 ? <p>No attendance records.</p> :
          <div style={listContainerStyle}>
            {records.map(student => (
              <div key={student.id} style={recordStyle}>
                <div><strong>{student.lastname}, {student.firstname}</strong>
                  <p style={{margin:0}}>{student.course} - {student.yearsection}</p>
                </div>

                <div style={checklistStyle}>
                  {events.map(evt => <label key={evt.id}><input type="checkbox" checked={student.events.includes(evt.id)} readOnly /> {evt.name}</label>)}
                </div>

                <div style={{fontWeight:"bold"}}>Total: {student.events.length}</div>
                <button style={deleteButtonStyle} onClick={()=>deleteStudent(student.id)}>Delete</button>
              </div>
            ))}

            <div style={paginationStyle}>
              <button style={buttonStyle} onClick={()=>setPage(p=>Math.max(p-1,0))} disabled={page===0}>Previous</button>
              <span>Page {page+1}</span>
              <button style={buttonStyle} onClick={()=>records.length===PAGE_SIZE && setPage(p=>p+1)} disabled={records.length<PAGE_SIZE}>Next</button>
            </div>
          </div>
        }
      </main>
      <footer style={footerStyle}><p>© 2026</p></footer>
    </div>
  );
}

// ============================
// STYLES
// ============================
const containerStyle={display:"flex",flexDirection:"column",minHeight:"100vh",fontFamily:"Arial, sans-serif",backgroundColor:"#f7f7f7",padding:"0 10px"};
const headerStyle={backgroundColor:"#FFD700",padding:"15px",textAlign:"center"};
const footerStyle={backgroundColor:"#FFD700",padding:"10px",textAlign:"center"};
const mainStyle={flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"15px",padding:"15px"};
const filterContainerStyle={display:"flex",gap:"10px",flexWrap:"wrap",justifyContent:"center"};
const dropdownStyle={padding:"10px",borderRadius:"8px",border:"1px solid #ccc",fontSize:"14px"};
const buttonContainerStyle={display:"flex",gap:"10px",flexWrap:"wrap",justifyContent:"center"};
const buttonStyle={padding:"12px 20px",fontSize:"16px",borderRadius:"8px",border:"none",backgroundColor:"#f4b400",color:"white",cursor:"pointer"};
const deleteButtonStyle={backgroundColor:"#d9534f",color:"white",border:"none",padding:"10px",borderRadius:"6px",cursor:"pointer",alignSelf:"flex-start"};
const listContainerStyle={width:"100%",maxWidth:"900px",display:"flex",flexDirection:"column",gap:"10px"};
const recordStyle={backgroundColor:"white",padding:"20px",borderRadius:"10px",boxShadow:"0 2px 6px rgba(0,0,0,0.15)",display:"flex",flexDirection:"column",gap:"12px",fontSize:"16px",color:"#000"};
const checklistStyle={display:"flex",flexWrap:"wrap",gap:"15px"};
const paginationStyle={display:"flex",gap:"10px",justifyContent:"center",alignItems:"center",marginTop:"15px"};

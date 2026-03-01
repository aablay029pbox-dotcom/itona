"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [editing, setEditing] = useState(null);

  const [formData, setFormData] = useState({
    id: "",
    firstname: "",
    lastname: "",
    course: "",
    yearsection: "",
  });

  // ============================
  // PROTECT PAGE
  // ============================
  useEffect(() => {
    const adminInfo = sessionStorage.getItem("adminInfo");
    if (!adminInfo) {
      router.push("/host");
    }
  }, [router]);

  // ============================
  // FETCH STUDENTS
  // ============================
  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setStudents(data);
      setFiltered(data);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // ============================
  // SEARCH
  // ============================
  useEffect(() => {
    const result = students.filter((s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.firstname.toLowerCase().includes(search.toLowerCase()) ||
      s.lastname.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [search, students]);

  // ============================
  // EDIT
  // ============================
  const handleEdit = (student) => {
    setEditing(student);
    setFormData(student);
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("students")
      .update({
        firstname: formData.firstname,
        lastname: formData.lastname,
        course: formData.course,
        yearsection: formData.yearsection,
      })
      .eq("id", formData.id);

    if (!error) {
      alert("Student updated!");
      setEditing(null);
      fetchStudents();
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>Manage Students</h1>
      </header>

      <main style={mainStyle}>
        {/* SEARCH */}
        <div style={cardStyle}>
          <h3>Search Student</h3>
          <input
            style={inputStyle}
            type="text"
            placeholder="Search by ID, Firstname, Lastname"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* STUDENT LIST */}
        <div style={cardStyle}>
          <h3>Student List</h3>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Lastname</th>
                  <th>Firstname</th>
                  <th>Course</th>
                  <th>Year & Section</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{student.lastname}</td>
                    <td>{student.firstname}</td>
                    <td>{student.course}</td>
                    <td>{student.yearsection}</td>
                    <td>
                      <button
                        style={buttonStyle}
                        onClick={() => handleEdit(student)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BACK BUTTON */}
        <button
          style={{ ...buttonStyle, backgroundColor: "#999" }}
          onClick={() => router.push("/admin")}
        >
          Back to Admin
        </button>
      </main>

      <footer style={headerStyle}>
        <p>© 2026</p>
      </footer>

      {/* EDIT MODAL */}
      {editing && (
        <div style={modalOverlay}>
          <div style={modalStyle}>
            <h3>Edit Student</h3>

            <input
              style={inputStyle}
              value={formData.firstname}
              onChange={(e) =>
                setFormData({ ...formData, firstname: e.target.value })
              }
              placeholder="Firstname"
            />

            <input
              style={inputStyle}
              value={formData.lastname}
              onChange={(e) =>
                setFormData({ ...formData, lastname: e.target.value })
              }
              placeholder="Lastname"
            />

            <input
              style={inputStyle}
              value={formData.course}
              onChange={(e) =>
                setFormData({ ...formData, course: e.target.value })
              }
              placeholder="Course"
            />

            <input
              style={inputStyle}
              value={formData.yearsection}
              onChange={(e) =>
                setFormData({ ...formData, yearsection: e.target.value })
              }
              placeholder="Year & Section"
            />

            <div style={{ marginTop: 15 }}>
              <button style={buttonStyle} onClick={handleUpdate}>
                Save
              </button>
              <button
                style={{ ...buttonStyle, backgroundColor: "red", marginLeft: 10 }}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES (SAME AS ADMIN) ================= */

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#f7f7f7",
};

const headerStyle = {
  backgroundColor: "#FFD700",
  padding: "20px",
  textAlign: "center",
};

const mainStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  padding: "20px",
  alignItems: "center",
};

const cardStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  width: "100%",
  maxWidth: "900px",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const buttonStyle = {
  padding: "8px 14px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
};

const inputStyle = {
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "300px",
};
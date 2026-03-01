"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function StudentPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    id: "",
    lastname: "",
    firstname: "",
    course: "",
    yearSection: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async () => {
    let { id, lastname, firstname, course, yearSection } = formData;

    // 1️⃣ Validate inputs
    if (!id || !lastname || !firstname || !course || !yearSection) {
      alert("Please complete all fields");
      return;
    }

    // Clean inputs
    id = id.trim();
    lastname = lastname.trim();
    firstname = firstname.trim();

    try {
      // 2️⃣ Check if the student ID already exists
      const { data: existingStudentById, error: fetchIdError } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchIdError) {
        console.error("Fetch ID Error:", fetchIdError);
        throw new Error(fetchIdError.message || JSON.stringify(fetchIdError));
      }

      if (existingStudentById) {
        // ID exists → check if other fields match
        if (
          existingStudentById.lastname !== lastname ||
          existingStudentById.firstname !== firstname ||
          existingStudentById.course !== course ||
          existingStudentById.yearsection !== yearSection
        ) {
          alert(
            "Student ID already exists but the provided details do not match the existing record."
          );
          return; // Block login
        }

        alert("Login successful using existing record.");
        setStudentLocal(existingStudentById);
        return;
      }

      // 3️⃣ Insert new student
      const { data: inserted, error: insertError } = await supabase
        .from("students")
        .insert([
          {
            id, // manually provided ID
            lastname,
            firstname,
            course,
            yearsection: yearSection // exact column name
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Insert Error:", insertError);
        throw new Error(insertError.message || JSON.stringify(insertError));
      }

      alert("New student record created and logged in.");
      setStudentLocal(inserted);

    } catch (err) {
      console.error("Login Error:", err);
      alert("Failed to login student: " + (err.message || JSON.stringify(err)));
    }
  };

  // Helper to save student info to localStorage
  const setStudentLocal = (studentRecord) => {
    const studentData = {
      id: studentRecord.id,
      firstname: studentRecord.firstname,
      lastname: studentRecord.lastname,
      course: studentRecord.course,
      yearsection: studentRecord.yearsection
    };

    localStorage.setItem("studentInfo", JSON.stringify(studentData));
    router.push("/student/qr");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      <header style={headerFooterStyle}>
        <h1>Student Login</h1>
      </header>

      <main style={mainStyle}>

        <input
          type="text"
          name="id"
          placeholder="Student ID"
          value={formData.id}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          type="text"
          name="lastname"
          placeholder="Last Name"
          value={formData.lastname}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          type="text"
          name="firstname"
          placeholder="First Name"
          value={formData.firstname}
          onChange={handleChange}
          style={inputStyle}
        />

        <select
          name="course"
          value={formData.course}
          onChange={handleChange}
          style={inputStyle}
        >
          <option value="">Select Course</option>
          <option value="BSCE">BSCE</option>
          <option value="BSSE">BSSE</option>
          <option value="BSCS">BSCS</option>
          <option value="BSIT">BSIT</option>
          <option value="BAT">BAT</option>
          <option value="RAC">RAC</option>
          <option value="EET">EET</option>
          <option value="BET-MET-AUTO">BET-MET-AUTO</option>
          <option value="BSMATH">BSMATH</option>
        </select>

        <select
          name="yearSection"
          value={formData.yearSection}
          onChange={handleChange}
          style={inputStyle}
        >
          <option value="">Select Year & Section</option>
          {[
            "1A","1B","1C","1D","1E",
            "2A","2B","2C","2D","2E",
            "3A","3B","3C","3D","3E",
            "4A","4B","4C","4D","4E"
          ].map((ys) => (
            <option key={ys} value={ys}>{ys}</option>
          ))}
        </select>

        <button onClick={handleLogin} style={buttonStyle}>
          Login
        </button>

      </main>

      <footer style={headerFooterStyle}>
        <p>© 2026</p>
      </footer>

    </div>
  );
}

const headerFooterStyle = {
  backgroundColor: "#FFD700",
  padding: "20px",
  textAlign: "center"
};

const mainStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "15px",
  padding: "20px"
};

const inputStyle = {
  padding: "12px",
  width: "250px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const buttonStyle = {
  padding: "12px 30px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
  width: "180px"
};
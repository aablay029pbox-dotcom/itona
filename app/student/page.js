"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function StudentPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    lastname: "",
    firstname: "",
    course: "",
    yearSection: ""
  });

  // ✅ Check if already logged in today
  useEffect(() => {
    const student = localStorage.getItem("studentInfo");

    if (student) {
      const parsed = JSON.parse(student);
      const today = new Date().toISOString().split("T")[0];

      if (parsed.loginDate === today) {
        router.push("/student/qr");
      } else {
        localStorage.removeItem("studentInfo");
      }
    }
  }, [router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async () => {
    let { lastname, firstname, course, yearSection } = formData;

    if (!lastname || !firstname || !course || !yearSection) {
      alert("Please complete all fields");
      return;
    }

    // ✅ Clean inputs (prevents duplicate because of spaces or casing)
    lastname = lastname.trim();
    firstname = firstname.trim();

    try {
      // 🔍 1️⃣ Check if student already exists
      const { data: existingStudent, error: fetchError } = await supabase
        .from("students")
        .select("*")
        .ilike("lastname", lastname)
        .ilike("firstname", firstname)
        .eq("course", course)
        .eq("yearsection", yearSection)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let studentRecord;

      // ✅ 2️⃣ If exists → use it
      if (existingStudent) {
        studentRecord = existingStudent;
      } else {
        // ➕ 3️⃣ If not exists → insert new
        const { data: inserted, error: insertError } = await supabase
          .from("students")
          .insert([
            {
              lastname,
              firstname,
              course,
              yearsection: yearsection
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        studentRecord = inserted;
      }

      // ✅ Save login date
      const today = new Date().toISOString().split("T")[0];

      const studentData = {
        id: studentRecord.id,
        firstname: studentRecord.firstname,
        lastname: studentRecord.lastname,
        course: studentRecord.course,
        yearsection: studentRecord.yearsection,
        loginDate: today
      };

      localStorage.setItem("studentInfo", JSON.stringify(studentData));

      router.push("/student/qr");

    } catch (err) {
      console.error("Login Error:", err);
      alert("Failed to login student");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      <header style={headerFooterStyle}>
        <h1>Student Login</h1>
      </header>

      <main style={mainStyle}>
        
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
          {["1A","1B","1C","1D","1E",
            "2A","2B","2C","2D","2E",
            "3A","3B","3C","3D","3E",
            "4A","4B","4C","4D","4E"].map((ys) => (
              <option key={ys} value={ys}>{ys}</option>
          ))}
        </select>

        {/* Left Logo */}
        <img
          src="/left.png"
          alt="Left"
          style={{
            position: "absolute",
            top: "10px",
            left: "13px",
            width: "55px",
            height: "55px",
            objectFit: "cover"
          }}
        />

        {/* Right Logo */}
        <img
          src="/right.png"
          alt="Right"
          style={{
            position: "absolute",
            top: "10px",
            right: "13px",
            width: "50px",
            height: "50px",
            objectFit: "cover"
          }}
        />

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
  padding: "20px",
  position: "relative"
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

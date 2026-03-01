"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function EventsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("add");
  const [events, setEvents] = useState([]);
  const [newEventName, setNewEventName] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================
  // FETCH EVENTS
  // ============================
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("id", { ascending: true });

    if (!error) setEvents(data || []);
  };

  // ============================
  // ADD EVENT
  // ============================
  const addEvent = async () => {
    if (!newEventName.trim()) return alert("Enter event name");

    setLoading(true);

    const { error } = await supabase.from("events").insert([
      {
        name: newEventName,
        is_open: true,
      },
    ]);

    if (error) alert("Failed to add event");
    else {
      alert("Event added!");
      setNewEventName("");
      fetchEvents();
    }

    setLoading(false);
  };

  // ============================
  // CLOSE EVENT
  // ============================
  const closeEvent = async (id) => {
    const { error } = await supabase
      .from("events")
      .update({ is_open: false })
      .eq("id", id);

    if (error) alert("Failed to close event");
    else {
      alert("Event closed");
      fetchEvents();
    }
  };

  // ============================
  // REOPEN EVENT
  // ============================
  const openEvent = async (id) => {
    const { error } = await supabase
      .from("events")
      .update({ is_open: true })
      .eq("id", id);

    if (error) alert("Failed to reopen event");
    else {
      alert("Event reopened");
      fetchEvents();
    }
  };

  // ============================
  // DELETE EVENT
  // ============================
  const deleteEvent = async (id) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this event? This cannot be undone."
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) alert("Failed to delete event");
    else {
      alert("Event deleted");
      fetchEvents();
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>Manage Events</h1>
      </header>

      <main style={mainStyle}>
        {/* ================= TABS ================= */}
        <div style={tabContainerStyle}>
          <button
            style={{
              ...tabButtonStyle,
              ...(activeTab === "add" ? activeTabStyle : {}),
            }}
            onClick={() => setActiveTab("add")}
          >
            Add Event
          </button>

          <button
            style={{
              ...tabButtonStyle,
              ...(activeTab === "manage" ? activeTabStyle : {}),
            }}
            onClick={() => setActiveTab("manage")}
          >
            Manage Events
          </button>
        </div>

        {/* ================= ADD EVENT ================= */}
        {activeTab === "add" && (
          <div style={cardStyle}>
            <h2>Add Event</h2>

            <input
              type="text"
              placeholder="Event Name"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              style={inputStyle}
            />

            <button onClick={addEvent} style={buttonStyle} disabled={loading}>
              {loading ? "Adding..." : "Add Event"}
            </button>
          </div>
        )}

        {/* ================= MANAGE EVENTS ================= */}
        {activeTab === "manage" && (
          <div style={cardStyle}>
            <h2>Manage Events</h2>

            {events.length === 0 ? (
              <p>No events available.</p>
            ) : (
              events.map((evt) => (
                <div key={evt.id} style={eventRowStyle}>
                  <span>
                    {evt.name} {evt.is_open ? "(Open)" : "(Closed)"}
                  </span>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {evt.is_open ? (
                      <button
                        style={closeButtonStyle}
                        onClick={() => closeEvent(evt.id)}
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        style={{
                          ...closeButtonStyle,
                          backgroundColor: "#5cb85c",
                        }}
                        onClick={() => openEvent(evt.id)}
                      >
                        Open
                      </button>
                    )}

                    <button
                      style={{
                        ...closeButtonStyle,
                        backgroundColor: "#000",
                      }}
                      onClick={() => deleteEvent(evt.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

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
  maxWidth: "500px",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#f4b400",
  color: "white",
  cursor: "pointer",
};

const closeButtonStyle = {
  padding: "6px 12px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#d9534f",
  color: "white",
  cursor: "pointer",
};

const eventRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const tabContainerStyle = {
  display: "flex",
  gap: "10px",
};

const tabButtonStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  cursor: "pointer",
  backgroundColor: "#eee",
};

const activeTabStyle = {
  backgroundColor: "#f4b400",
  color: "white",
  border: "none",
};
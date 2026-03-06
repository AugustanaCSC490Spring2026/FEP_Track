import { useState } from "react"

const sampleJobs = [
  { id: 1, title: "Library Assistant", location: "Main Library, Room 104", hours: "Mon/Wed 10am–1pm", supervisor: "Ms. Reyes" },
  { id: 2, title: "Campus Tour Guide", location: "Admissions Office", hours: "Fri 9am–12pm", supervisor: "Mr. Patel" },
]

function Dashboard() {
  const [title, setTitle] = useState("")
  const [time, setTime] = useState("")
  const [events, setEvents] = useState([])
  const [activeTab, setActiveTab] = useState("schedule")

  function addEvent() {
    if (!title || !time) return
    const newEvent = {
      id: Date.now(),
      title: title,
      time: time
    }
    setEvents([...events, newEvent])
    setTitle("")
    setTime("")
  }

  function deleteEvent(id) {
    setEvents(events.filter(event => event.id !== id))
  }

  return (
    <div style={{ maxWidth: "600px", margin: "auto", textAlign: "center", fontFamily: "sans-serif", paddingTop: "30px" }}>
      <h1>Schedule Dashboard</h1>

      {/* Tab Bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #ddd", marginBottom: "24px" }}>
        {["schedule", "currentJobs"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: activeTab === tab ? "700" : "400",
              color: activeTab === tab ? "#2563eb" : "#555",
              borderBottom: activeTab === tab ? "3px solid #2563eb" : "3px solid transparent",
              marginBottom: "-2px",
              transition: "all 0.15s ease"
            }}
          >
            {tab === "schedule" ? "Schedule" : "Current Jobs"}
          </button>
        ))}
      </div>

      {/* Schedule Tab — your original code */}
      {activeTab === "schedule" && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Event name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <button onClick={addEvent}>
              Add Event
            </button>
          </div>
          <div>
            {events.map((event) => (
              <div key={event.id}>
                <span>{event.time} - {event.title}</span>
                <button onClick={() => deleteEvent(event.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Jobs Tab */}
      {activeTab === "currentJobs" && (
        <div style={{ textAlign: "left" }}>
          {sampleJobs.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center" }}>You are not signed up for any jobs yet.</p>
          ) : (
            sampleJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  marginBottom: "14px",
                  background: "#f8fafc",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
                }}
              >
                <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "6px" }}>{job.title}</div>
                <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>📍 {job.location}</div>
                <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>🕒 {job.hours}</div>
                <div style={{ color: "#555", fontSize: "14px" }}>👤 {job.supervisor}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
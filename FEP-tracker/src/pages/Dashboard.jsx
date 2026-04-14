import { useState, useEffect } from "react"
import { database } from "../firebase-config"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore"
import EventCard from "../components/event-card";
import TimeClockModal from "../components/timeClock";
import { Row, Col, Container } from "react-bootstrap";
function Dashboard({ user }) {

  const [myCurrentJobs, setMyCurrentJobs] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [confirmDropId, setConfirmDropId] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const jobsQuery = query(
          collection(database, "upcoming_events"),
          where("students", "array-contains", user.uid)
        )
        const jobsSnap = await getDocs(jobsQuery)
        const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setMyCurrentJobs(jobs)
      } catch (e) {
        console.error("Error loading dashboard:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.uid])

  const handleDrop = async (uid, jobId) => {
    setConfirmDropId(jobId)
  }

  const confirmDrop = async (jobId) => {
    await updateDoc(doc(database, "upcoming_events", jobId), {
      students: arrayRemove(user.uid)
    })
    setMyCurrentJobs(prev => prev.filter(j => j.id !== jobId))
    setConfirmDropId(null)
  }

  const ConfirmDropModal = ({ job }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#fff", borderRadius: "14px", padding: "28px 28px 24px", maxWidth: "360px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px", color: "#1e293b" }}>Drop this job?</div>
        <div style={{ fontSize: "14px", color: "#555", marginBottom: "6px" }}>
          You're about to drop <strong>{job.title}</strong>.
        </div>
        <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>
          You'll no longer be scheduled for this job.
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setConfirmDropId(null)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={() => confirmDrop(job.id)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#dc2626", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#fff" }}
          >
            Drop Job
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div style={{ maxWidth: "600px", margin: "auto", textAlign: "center", paddingTop: "80px", fontFamily: "sans-serif", color: "#94a3b8" }}>
        Loading your dashboard...
      </div>
    )
  }

  const jobToDrop = myCurrentJobs.find(j => j.id === confirmDropId)

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      {confirmDropId && jobToDrop && <ConfirmDropModal job={jobToDrop} />}

      <Row className="g-4">
        {/* LEFT COLUMN: User Summary & Actions */}
        <Col lg={5} md={6} className="d-flex flex-column align-items-start">
          <div className="sticky-top" style={{ top: "20px", width: "100%" }}>
            <div className="mb-4">
              <h2 style={{ color: "var(--color-primary-blue-light)", fontWeight: "700", marginBottom: "5px" }}>
                My Dashboard
              </h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: "1.4" }}>
                Welcome, <strong>{user.displayName || "Student"}</strong>.
                View your schedule and use the clock to track your hours.
              </p>
            </div>

            <div className="p-4 rounded shadow-sm mb-3" style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-bg-darker)" }}>
              <TimeClockModal user={user} jobs={myCurrentJobs} />
            </div>
          </div>
        </Col>

        {/* RIGHT COLUMN: The Job List */}
        <Col lg={7} md={6} style={{ borderLeft: "1px solid #334155" }}>
          <h3 className="mb-4" style={{ color: "var(--color-primary-blue-light)", fontWeight: "700" }}>Current Jobs</h3>
          <div className="mb-4">
            <small style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
              Total Jobs Scheduled: <strong style={{ color: "var(--color-primary-blue-light)" }}>{myCurrentJobs.length}</strong>
            </small>
          </div>
          {myCurrentJobs.length === 0 ? (
              <div className="text-center py-5 rounded" style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-bg-darker)" }}>
                <p style={{ color: "#888", margin: 0 }}>You are not signed up for any jobs yet.</p>
              </div>
          ) : (
              <div className="event-scroll-container">
                {myCurrentJobs.map((job) => (
                    <EventCard
                      key={job.id}
                      event={job}
                      user={user}
                      status="MyJobs"
                      onCallBack={handleDrop}
                      onEdit={() => {}}
                    />
                ))}
              </div>
          )}
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
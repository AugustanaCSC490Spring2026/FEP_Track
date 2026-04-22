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
import { Row, Col, Container, ButtonGroup, Button } from "react-bootstrap";
function Dashboard({ user }) {

  const [myJobs, setMyJobs] = useState([])
  const [pendingJobs, setPendingJobs] = useState([])
  const [currentTab, setCurrentTab] = useState("Approved")
  const [loading, setLoading] = useState(true)
  const [confirmDropId, setConfirmDropId] = useState(null)

  useEffect(() => {
    const sortJobs = (list) => {
      return list.sort((a, b) => {
        if (!a.date || a.date === "TBD") return 1;
        if (!b.date || b.date === "TBD") return -1;

        const dateTimeA = new Date(`${a.date}T${a.startTime || "00:00"}`);
        const dateTimeB = new Date(`${b.date}T${b.startTime || "00:00"}`);
        const diff = dateTimeA - dateTimeB;

        if (diff === 0) {
          const endA = a.endTime || "00:00";
          const endB = b.endTime || "00:00";
          return endA.localeCompare(endB);
        }

        return diff;
      });
    };

    const load = async () => {
      try {
        setLoading(true);
        const eventsRef = collection(database, "upcoming_events");

        const approvedQuery = query(eventsRef, where("students", "array-contains", user.uid));
        const approvedSnap = await getDocs(approvedQuery);
        const approvedList = approvedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMyJobs(sortJobs(approvedList));

        const pendingQuery = query(eventsRef, where("pending_students", "array-contains", user.uid));
        const pendingSnap = await getDocs(pendingQuery);
        const pendingList = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPendingJobs(sortJobs(pendingList));

      } catch (e) {
        console.error("Error loading dashboard:", e);
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) load();
  }, [user.uid]);

  const handleDrop = async (uid, jobId) => {
    setConfirmDropId(jobId)
  }

  const confirmDrop = async (jobId) => {
    const isPending = pendingJobs.some(j => j.id === jobId);
    const updateField = isPending ? "pending_students" : "students";

    await updateDoc(doc(database, "upcoming_events", jobId), {
      [updateField]: arrayRemove(user.uid)
    })

    if (isPending) {
      setPendingJobs(prev => prev.filter(j => j.id !== jobId))
    } else {
      setMyJobs(prev => prev.filter(j => j.id !== jobId))
    }
    setConfirmDropId(null)
  }

  const ConfirmDropModal = ({job}) => {
    const isPending = currentTab === "Pending";
    return (
      <div style={{position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", paddingTop: "100px", justifyContent: "center", zIndex: 9999}}>
        <div style={{background: "#fff", borderRadius: "14px", padding: "28px 28px 24px", maxWidth: "360px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)"}}>
          <div style={{fontSize: "20px", fontWeight: "700", marginBottom: "10px", color: "#1e293b"}}>
            {isPending ? "Withdraw Application?" : "Drop Job?"}
          </div>
          <div style={{fontSize: "14px", color: "#555", marginBottom: "6px"}}>
            {isPending ? `Are you sure you want to withdraw your application for ${job.title}?` : `You're about to remove yourself from ${job.title}.`}
          </div>
          {currentTab === "Approved" && (
              <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>
                You'll no longer be scheduled for this job.
              </div>
          )}
          <div style={{display: "flex", gap: "10px"}}>
            <button onClick={() => setConfirmDropId(null)} style={{flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151"}}>Cancel</button>
            <button onClick={() => confirmDrop(job.id)} style={{flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#dc2626", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#fff"}}>{isPending ? "Withdraw" : "Confirm Drop"}</button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ maxWidth: "600px", margin: "auto", textAlign: "center", paddingTop: "80px", fontFamily: "sans-serif", color: "#94a3b8" }}>
        Loading your dashboard...
      </div>
    )
  }

  const jobToDrop = [...myJobs, ...pendingJobs].find(j => j.id === confirmDropId)

  const displayedJobs = currentTab === "Approved" ? myJobs : pendingJobs;

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
              <TimeClockModal user={user} jobs={myJobs} />
            </div>
          </div>
        </Col>

        {/* RIGHT COLUMN: The Job List */}
        <Col lg={7} md={6} style={{ borderLeft: "1px solid #334155" }}>
          <h3 className="mb-4" style={{ color: "var(--color-primary-blue-light)", fontWeight: "700" }}>Current Jobs</h3>
          <div className="mb-4">
            <ButtonGroup className="w-100">
              <Button
                  variant={currentTab === "Approved" ? "primary" : "outline-primary"}
                  onClick={() => setCurrentTab("Approved")}
              >
                Approved ({myJobs.length})
              </Button>
              <Button
                  variant={currentTab === "Pending" ? "primary" : "outline-primary"}
                  onClick={() => setCurrentTab("Pending")}
              >
                Pending ({pendingJobs.length})
              </Button>
            </ButtonGroup>
          </div>
          <div className="mb-4">
            <small style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
              {currentTab === "Approved" ? "Total Jobs Scheduled: " : "Total Jobs Pending Approval: "}
              <strong style={{ color: "var(--color-primary-blue-light)" }}>
                {currentTab === "Approved" ? myJobs.length : pendingJobs.length}
              </strong>
            </small>
          </div>
          {displayedJobs.length === 0 ? (
              <div className="text-center py-5 rounded" style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-bg-darker)" }}>
                <p style={{ color: "#888", margin: 0 }}>You are not signed up for any jobs yet.</p>
              </div>
          ) : (
              <div className="event-scroll-container">
                {displayedJobs.map((job) => (
                    <EventCard
                      key={job.id}
                      event={job}
                      user={user}
                      status={currentTab === "Pending" ? "Pending" : "MyJobs"}
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
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

// Every job pays the same hourly rate — change this one number if it ever updates
const HOURLY_RATE = 10.50


function Dashboard({ user }) {

  const [activeTab,     setActiveTab]     = useState("currentJobs")
  const [myCurrentJobs, setMyCurrentJobs] = useState([])
  const [shiftLog,      setShiftLog]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [confirmDropId, setConfirmDropId] = useState(null)


  // ── DATA FETCHING ──────────────────────────────────────────────────────────
  // Pulls this student's jobs from the "events" collection the admin writes to.
  // Shifts default to empty if that collection doesn't exist yet.
  // The finally block makes sure loading always stops even if something errors.

  useEffect(() => {
    const load = async () => {
      try {
        const jobsQuery = query(
          collection(database, "events"),
          where("students", "array-contains", user.uid)
        )
        const jobsSnap = await getDocs(jobsQuery)
        const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        // shifts collection may not exist yet — default to empty if it errors
        let shifts = []
        try {
          const shiftsQuery = query(
            collection(database, "shifts"),
            where("studentId", "==", user.uid)
          )
          const shiftsSnap = await getDocs(shiftsQuery)
          shifts = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        } catch (e) {
          console.log("Shifts collection not set up yet:", e)
        }

        setMyCurrentJobs(jobs)
        setShiftLog(shifts)

      } catch (e) {
        console.error("Error loading dashboard:", e)
      } finally {
        // this always runs no matter what — stops the loading screen
        setLoading(false)
      }
    }
    load()
  }, [user.uid])


  // ── DROP JOB ───────────────────────────────────────────────────────────────
  // Removes the student's uid from the job's "students" array in Firestore.
  // Shifts stay untouched so work history is preserved.

  const handleDrop = async (jobId) => {
    await updateDoc(doc(database, "events", jobId), {
      students: arrayRemove(user.uid)
    })
    setMyCurrentJobs(prev => prev.filter(j => j.id !== jobId))
    setConfirmDropId(null)
  }


  // ── STATS ──────────────────────────────────────────────────────────────────
  // Only "approved" shifts count toward totals.
  // Pending shifts show in the yellow banner but not in the main numbers.

  const approvedShifts = shiftLog.filter(s => s.status === "approved")
  const pendingShifts  = shiftLog.filter(s => s.status === "pending")

  const totalApprovedHours    = approvedShifts.reduce((sum, s) => sum + s.hoursWorked, 0)
  const totalPendingHours     = pendingShifts.reduce((sum, s) => sum + s.hoursWorked, 0)
  const totalApprovedEarnings = totalApprovedHours * HOURLY_RATE
  const totalPendingEarnings  = totalPendingHours * HOURLY_RATE


  // ── SHARED STYLES ──────────────────────────────────────────────────────────

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px 24px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
  }

  const labelStyle = {
    fontSize: "11px",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "6px",
  }


  // ── BADGE ──────────────────────────────────────────────────────────────────
  // Green = approved, yellow = waiting on admin, red = rejected.

  const Badge = ({ status }) => {
    const map = {
      approved: { bg: "#dcfce7", color: "#16a34a", label: "Approved"         },
      pending:  { bg: "#fef9c3", color: "#b45309", label: "Pending approval" },
      rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected"         },
    }
    const s = map[status] || map.pending
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "99px" }}>
        {s.label}
      </span>
    )
  }


  // ── CONFIRM DROP MODAL ─────────────────────────────────────────────────────
  // Forces the student to confirm before a job is actually dropped.

  const ConfirmDropModal = ({ job }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#fff", borderRadius: "14px", padding: "28px 28px 24px", maxWidth: "360px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px", color: "#1e293b" }}>Drop this job?</div>
        <div style={{ fontSize: "14px", color: "#555", marginBottom: "6px" }}>
          You're about to drop <strong>{job.title}</strong>.
        </div>
        <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>
          Your approved hours and earnings will still be saved, but you'll no longer be scheduled for this job.
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setConfirmDropId(null)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleDrop(job.id)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#dc2626", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#fff" }}
          >
            Drop Job
          </button>
        </div>
      </div>
    </div>
  )


  // ── LOADING SCREEN ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ maxWidth: "600px", margin: "auto", textAlign: "center", paddingTop: "80px", fontFamily: "sans-serif", color: "#94a3b8" }}>
        Loading your dashboard...
      </div>
    )
  }


  // ── RENDER ─────────────────────────────────────────────────────────────────

  const jobToDrop = myCurrentJobs.find(j => j.id === confirmDropId)

  return (
    <div style={{ maxWidth: "600px", margin: "auto", fontFamily: "sans-serif", paddingTop: "30px", paddingBottom: "40px", paddingLeft: "16px", paddingRight: "16px" }}>
      
      {confirmDropId && jobToDrop && <ConfirmDropModal job={jobToDrop} />}

      <h1 style={{ textAlign: "center", fontSize: "26px", fontWeight: "700", marginBottom: "24px" }}>
        Schedule Dashboard
      </h1>
   
      {/* ── TAB BAR ── */}
      <div style={{ display: "flex", borderBottom: "2px solid #ddd", marginBottom: "28px" }}>
        {["currentJobs", "workOverview"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 24px", border: "none", background: "none", cursor: "pointer",
            fontSize: "15px", fontWeight: activeTab === tab ? "700" : "400",
            color: activeTab === tab ? "#2563eb" : "#555",
            borderBottom: activeTab === tab ? "3px solid #2563eb" : "3px solid transparent",
            marginBottom: "-2px", transition: "all 0.15s ease",
          }}>
            {tab === "currentJobs" ? "My Current Jobs" : "Work Overview"}
          </button>
        ))}
      </div>


      {/* ── CURRENT JOBS TAB ── */}
      {activeTab === "currentJobs" && (
        <div style={{ textAlign: "left" }}>
          {myCurrentJobs.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center" }}>You are not signed up for any jobs yet.</p>
          ) : (
            myCurrentJobs.map((job) => (
              <div key={job.id} style={{ ...cardStyle, marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "6px" }}>{job.title}</div>
                  <button
                    onClick={() => setConfirmDropId(job.id)}
                    style={{ fontSize: "12px", fontWeight: "600", color: "#dc2626", background: "#fee2e2", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", flexShrink: 0, marginLeft: "12px" }}
                  >
                    Drop
                  </button>
                </div>
                <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>📍 {job.location}</div>
                <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>📅 {job.date}</div>
                <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>🕒 {job.time}</div>
                <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>👤 {job.supervisor}</div>
                {job.extra_details && job.extra_details !== "TBD" && (
                  <div style={{ color: "#888", fontSize: "13px", marginTop: "6px", fontStyle: "italic" }}>ℹ️ {job.extra_details}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}


      {/* ── WORK OVERVIEW TAB ── */}
      {activeTab === "workOverview" && (
        <div style={{ textAlign: "left" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "10px" }}>
            <div style={{ ...cardStyle, borderLeft: "4px solid #2563eb" }}>
              <div style={labelStyle}>Hours Earned</div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", lineHeight: 1 }}>{totalApprovedHours}</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>admin approved</div>
            </div>
            <div style={{ ...cardStyle, borderLeft: "4px solid #16a34a" }}>
              <div style={labelStyle}>Earnings</div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", lineHeight: 1 }}>${totalApprovedEarnings.toFixed(2)}</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>admin approved</div>
            </div>
          </div>

          {pendingShifts.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 16px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400e" }}>⏳ Awaiting approval</div>
                <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}>
                  {totalPendingHours} hrs · ${totalPendingEarnings.toFixed(2)} not yet counted
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "#b45309", fontWeight: "600" }}>
                {pendingShifts.length} shift{pendingShifts.length > 1 ? "s" : ""}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Breakdown by Job
          </h2>
          {myCurrentJobs.map((job) => {
            const jobApproved = approvedShifts.filter(s => s.jobId === job.id)
            const jobPending  = pendingShifts.filter(s => s.jobId === job.id)
            const jobHours    = jobApproved.reduce((sum, s) => sum + s.hoursWorked, 0)
            const jobEarnings = jobHours * HOURLY_RATE
            const pct = totalApprovedHours > 0 ? Math.round((jobHours / totalApprovedHours) * 100) : 0
            return (
              <div key={job.id} style={{ ...cardStyle, marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "700", fontSize: "15px", color: "#1e293b" }}>{job.title}</span>
                  <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: "600" }}>${jobEarnings.toFixed(2)} earned</span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#555", marginBottom: "10px", flexWrap: "wrap" }}>
                  <span>✅ {jobHours} hrs approved</span>
                  <span>💵 ${HOURLY_RATE.toFixed(2)}/hr</span>
                  {jobPending.length > 0 && (
                    <span style={{ color: "#b45309" }}>⏳ {jobPending.reduce((s, x) => s + x.hoursWorked, 0)} hrs pending</span>
                  )}
                </div>
                <div style={{ background: "#f1f5f9", borderRadius: "99px", height: "6px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, background: "#2563eb", height: "100%", borderRadius: "99px" }} />
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{pct}% of approved hours</div>
              </div>
            )
          })}

          <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", margin: "24px 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Shift History
          </h2>
          {shiftLog.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center", fontSize: "14px" }}>No shifts logged yet.</p>
          ) : (
            [...shiftLog].reverse().map((shift) => {
              const job = myCurrentJobs.find(j => j.id === shift.jobId)
              const pay = shift.hoursWorked * HOURLY_RATE
              return (
                <div key={shift.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>{job?.title ?? "Unknown Job"}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{shift.date} · {shift.hoursWorked} hrs · ${pay.toFixed(2)}</div>
                  </div>
                  <Badge status={shift.status} />
                </div>
              )
            })
          )}

          <p style={{ fontSize: "11px", color: "#cbd5e1", textAlign: "center", marginTop: "20px" }}>
            Totals update only after admin approval.
          </p>
        </div>
      )}

    </div>
  )
}

export default Dashboard
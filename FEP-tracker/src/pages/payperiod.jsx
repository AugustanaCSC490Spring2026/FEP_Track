import { useEffect, useState } from "react";
import { database } from "../firebase-config";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Spinner from "react-bootstrap/Spinner";

function parseDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(val);
}

function formatPeriodRange(period) {
  const fmt = (val) => {
    const date = parseDate(val);
    if (!date) return "?";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return `${fmt(period.startdate)} – ${fmt(period.enddate)}`;
}

function formatHours(hours, minutes) {
  return `${hours}:${(minutes ?? 0).toString().padStart(2, "0")}`;
}

// ── Student Modal ─────────────────────────────────────────────────────────────

function StudentModal({ show, onHide, period, user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !period || !user) return;

    async function loadJobs() {
      setLoading(true);
      try {
        const attendance = period.attendance?.[user.uid] ?? [];
        /* console.log("Loading jobs for user:", user.uid, "Attendance entries:", attendance); */
        const resolved = await Promise.all(
          attendance.map(async (entry) => {
            try {
              const jobDoc = await getDoc(
                doc(database, "completed_events", entry.job_id),
              );
              /*  console.log("Resolving job ID:", entry.job_id, "Found:", jobDoc.exists()); */
              const jobName = jobDoc.exists()
                ? jobDoc.data().title
                : entry.job_id;
              return { ...entry, jobName };
            } catch {
              return { ...entry, jobName: entry.job_id };
            }
          }),
        );
        setJobs(resolved);
      } catch (err) {
        console.error("Error loading student jobs:", err);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [show, period, user]);

  const totalMins = jobs.reduce(
    (sum, j) => sum + (j.hours ?? 0) * 60 + (j.minutes ?? 0),
    0,
  );
  const totalHours = Math.floor(totalMins / 60);
  const leftoverMinutes = totalMins % 60;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ borderBottom: "1px solid #e5e7eb" }}>
        <Modal.Title
          style={{ color: "#1b3a5c", fontSize: "1rem", fontWeight: 700 }}
        >
          My Hours — {period ? formatPeriodRange(period) : ""}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" style={{ color: "#1b3a5c" }} />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-muted text-center py-4 mb-0">
            No hours recorded for this period.
          </p>
        ) : (
          <>
            <Table className="mb-0" hover>
              <thead style={{ backgroundColor: "#f3f4f6" }}>
                <tr>
                  <th
                    style={{
                      color: "#6b7280",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      border: "none",
                      padding: "10px 16px",
                    }}
                  >
                    JOB
                  </th>
                  <th
                    className="text-end"
                    style={{
                      color: "#6b7280",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      border: "none",
                      padding: "10px 16px",
                    }}
                  >
                    HOURS
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        color: "#1b3a5c",
                        fontWeight: 600,
                        padding: "12px 16px",
                        borderColor: "#e5e7eb",
                      }}
                    >
                      {job.jobName}
                    </td>
                    <td
                      className="text-end"
                      style={{
                        color: "#374151",
                        padding: "12px 16px",
                        borderColor: "#e5e7eb",
                      }}
                    >
                      
                      {formatHours(job.hours ?? 0, job.minutes ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div
              className="d-flex justify-content-between align-items-center px-3 py-3"
              style={{
                backgroundColor: "#eff6ff",
                borderTop: "2px solid #bfdbfe",
              }}
            >
              <span className="fw-bold" style={{ color: "#1b3a5c" }}>
                Total
              </span>
              <Badge
                style={{
                  backgroundColor: "#1b3a5c",
                  fontSize: "0.85rem",
                  padding: "6px 12px",
                }}
              >
                {formatHours(totalHours, leftoverMinutes)}
              </Badge>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

// ── Staff Modal ───────────────────────────────────────────────────────────────

function StaffModal({ show, onHide, period }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // ── Load all students when modal opens ──
  useEffect(() => {
    if (!show || !period) return;
    setSelectedStudent(null);
    setJobs([]);

    async function loadStudents() {
      setLoading(true);
      try {
        const attendance = period.attendance ?? {};
        const resolved = await Promise.all(
          Object.entries(attendance).map(async ([uid, entries]) => {
            let name = uid;
            try {
              const userDoc = await getDoc(doc(database, "users", uid));
              if (userDoc.exists()) {
                const data = userDoc.data();
               
                name = data.name;
              }
            } catch {
                // ignore and just use uid as name
            }

            const totalMins = entries.reduce(
              (sum, e) => sum + (e.hours ?? 0) * 60 + (e.minutes ?? 0),
              0,
            );
            const hours = Math.floor(totalMins / 60);
            const minutes = totalMins % 60;

            return {
              uid,
              name,
              hours,
              minutes,
              jobCount: entries.length,
              entries,
            };
          }),
        );
        resolved.sort(
          (a, b) => b.hours * 60 + b.minutes - (a.hours * 60 + a.minutes),
        );
        setStudents(resolved);
      } catch (err) {
        console.error("Error loading staff attendance:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [show, period]);

  // ── Load job details when a student row is clicked ──
  async function handleStudentClick(student) {
    setSelectedStudent(student);
    setJobsLoading(true);
    try {
      const resolved = await Promise.all(
        student.entries.map(async (entry) => {
          try {
            const jobDoc = await getDoc(
              doc(database, "completed_events", entry.job_id),
            );
            const jobName = jobDoc.exists()
              ? jobDoc.data().title
              : entry.job_id;
            return { ...entry, jobName };
          } catch {
            return { ...entry, jobName: entry.job_id };
          }
        }),
      );
      setJobs(resolved);
    } catch (err) {
      console.error("Error loading jobs for student:", err);
    } finally {
      setJobsLoading(false);
    }
  }

  function handleBack() {
    setSelectedStudent(null);
    setJobs([]);
  }

  const grandTotalMins = students.reduce(
    (sum, s) => sum + s.hours * 60 + s.minutes,
    0,
  );
  const grandHours = Math.floor(grandTotalMins / 60);
  const grandMinutes = grandTotalMins % 60;

  const studentTotalMins = jobs.reduce(
    (sum, j) => sum + (j.hours ?? 0) * 60 + (j.minutes ?? 0),
    0,
  );
  const studentTotalHours = Math.floor(studentTotalMins / 60);
  const studentTotalMinutes = studentTotalMins % 60;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ borderBottom: "1px solid #e5e7eb" }}>
        <Modal.Title
          style={{ color: "#1b3a5c", fontSize: "1rem", fontWeight: 700 }}
        >
          {selectedStudent ? (
            <span>
              {/* Back button */}
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4a90d9",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  padding: "0 8px 0 0",
                  cursor: "pointer",
                }}
              >
                ‹ Back
              </button>
              {selectedStudent.name}
            </span>
          ) : (
            <>All Students — {period ? formatPeriodRange(period) : ""}</>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        {!selectedStudent &&
          (loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner animation="border" style={{ color: "#1b3a5c" }} />
            </div>
          ) : students.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">
              No attendance recorded for this period.
            </p>
          ) : (
            <>
              <Table className="mb-0" hover>
                <thead style={{ backgroundColor: "#f3f4f6" }}>
                  <tr>
                    <th
                      style={{
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        border: "none",
                        padding: "10px 16px",
                      }}
                    >
                      STUDENT
                    </th>
                    <th
                      className="text-center"
                      style={{
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        border: "none",
                        padding: "10px 16px",
                      }}
                    >
                      JOBS
                    </th>
                    <th
                      className="text-end"
                      style={{
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        border: "none",
                        padding: "10px 16px",
                      }}
                    >
                      TOTAL HRS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.uid}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleStudentClick(s)}
                    >
                      <td
                        style={{
                          color: "#1b3a5c",
                          fontWeight: 600,
                          padding: "12px 16px",
                          borderColor: "#e5e7eb",
                        }}
                      >
                        {s.name}
                        <span
                          style={{
                            color: "#9ca3af",
                            fontSize: "0.75rem",
                            marginLeft: 6,
                          }}
                        >
                          tap to view jobs ›
                        </span>
                      </td>
                      <td
                        className="text-center"
                        style={{
                          color: "#6b7280",
                          padding: "12px 16px",
                          borderColor: "#e5e7eb",
                        }}
                      >
                        {s.jobCount}
                      </td>
                      <td
                        className="text-end"
                        style={{
                          color: "#374151",
                          padding: "12px 16px",
                          borderColor: "#e5e7eb",
                        }}
                      >
                        {formatHours(s.hours, s.minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div
                className="d-flex justify-content-between align-items-center px-3 py-3"
                style={{
                  backgroundColor: "#eff6ff",
                  borderTop: "2px solid #bfdbfe",
                }}
              >
                <span className="fw-bold" style={{ color: "#1b3a5c" }}>
                  Grand Total ({students.length} students)
                </span>
                <Badge
                  style={{
                    backgroundColor: "#1b3a5c",
                    fontSize: "0.85rem",
                    padding: "6px 12px",
                  }}
                >
                  {formatHours(grandHours, grandMinutes)}
                </Badge>
              </div>
            </>
          ))}

        {/* ── Student job detail view ── */}
        {selectedStudent &&
          (jobsLoading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner animation="border" style={{ color: "#1b3a5c" }} />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">No jobs found.</p>
          ) : (
            <>
              <Table className="mb-0" hover>
                <thead style={{ backgroundColor: "#f3f4f6" }}>
                  <tr>
                    <th
                      style={{
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        border: "none",
                        padding: "10px 16px",
                      }}
                    >
                      JOB
                    </th>
                    <th
                      className="text-end"
                      style={{
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        border: "none",
                        padding: "10px 16px",
                      }}
                    >
                      HOURS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          color: "#1b3a5c",
                          fontWeight: 600,
                          padding: "12px 16px",
                          borderColor: "#e5e7eb",
                        }}
                      >
                        {job.jobName}
                      </td>
                      <td
                        className="text-end"
                        style={{
                          color: "#374151",
                          padding: "12px 16px",
                          borderColor: "#e5e7eb",
                        }}
                      >
                        {formatHours(job.hours ?? 0, job.minutes ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div
                className="d-flex justify-content-between align-items-center px-3 py-3"
                style={{
                  backgroundColor: "#eff6ff",
                  borderTop: "2px solid #bfdbfe",
                }}
              >
                <span className="fw-bold" style={{ color: "#1b3a5c" }}>
                  Total
                </span>
                <Badge
                  style={{
                    backgroundColor: "#1b3a5c",
                    fontSize: "0.85rem",
                    padding: "6px 12px",
                  }}
                >
                  {formatHours(studentTotalHours, studentTotalMinutes)}
                </Badge>
              </div>
            </>
          ))}
      </Modal.Body>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PayPeriod({ user }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchPayPeriods() {
      setLoading(true);
      try {
        const periodRef = collection(database, "periods");
        const q = query(periodRef, orderBy("enddate", "desc"));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (fetched.length > 0) {
          setPeriods(fetched);
          setSelectedPeriod(fetched[0]);
        }
        console.log("Fetched pay periods:", fetched);
      } catch (error) {
        console.error("Error fetching pay periods:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPayPeriods();
  }, []);

  if (loading) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center gap-3"
        style={{ minHeight: "60vh" }}
      >
        <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
          Loading pay periods…
        </p>
      </div>
    );
  }

  if (!periods.length) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "60vh" }}
      >
        <p className="text-muted">No pay periods found.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="d-flex flex-column align-items-center w-100"
        style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}
      >
        <div className="w-100 border-0 rounded-0 text-center mb-2">
          <div className="py-4">
            <p className="text-white mb-1" style={{ fontSize: "1.6rem" }}>
              Current pay period
            </p>
            <h1
              className="fw-bold mb-0"
              style={{
                color: "#1b3a5c",
                fontSize: "clamp(1.15rem, 5vw, 1.6rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {formatPeriodRange(selectedPeriod)}
            </h1>
          </div>
        </div>

        <Card
          className="w-100 border-0 rounded-0"
          style={{ backgroundColor: "transparent" }}
        >
          <h2 className="text-center">Select a Pay Period</h2>
          <Card.Body className="p-0">
            {periods.map((p) => (
              <button
                key={p.id}
                className="d-flex align-items-center justify-content-between w-100 px-3 py-3 border-0 text-start"
                style={{
                  backgroundColor:
                    selectedPeriod?.id === p.id ? "#eff6ff" : "transparent",
                  borderBottom: "1px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onClick={() => {
                  setSelectedPeriod(p);
                  setShowModal(true);
                }}
              >
                <span
                  className="fw-semibold"
                  style={{ color: "#1b3a5c", fontSize: "1rem" }}
                >
                  {formatPeriodRange(p)}
                </span>
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "1.4rem",
                    lineHeight: 1,
                  }}
                >
                  ›
                </span>
              </button>
            ))}
          </Card.Body>
        </Card>
      </div>

      {(user?.role === "staff" || user?.role === "admin")? (
        <StaffModal
          show={showModal}
          onHide={() => setShowModal(false)}
          period={selectedPeriod}
        />
      ) : (
        <StudentModal
          show={showModal}
          onHide={() => setShowModal(false)}
          period={selectedPeriod}
          user={user}
        />
      )}
    </>
  );
}

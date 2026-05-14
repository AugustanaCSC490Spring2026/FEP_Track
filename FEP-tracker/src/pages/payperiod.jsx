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
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
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
  if (!period) return "";
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

function StudentPeriodDetails({ period, user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period || !user) return;
    async function loadJobs() {
      setLoading(true);
      try {
        const attendance = period.attendance?.[user.uid] ?? [];
        const resolved = await Promise.all(
          attendance.map(async (entry) => {
            try {
              const jobDoc = await getDoc(doc(database, "completed_events", entry.job_id));
              const jobName = jobDoc.exists() ? jobDoc.data().title : entry.job_id;
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
  }, [period, user]);

  const totalMins = jobs.reduce((sum, j) => sum + (j.hours ?? 0) * 60 + (j.minutes ?? 0), 0);
  const totalHours = Math.floor(totalMins / 60);
  const leftoverMinutes = totalMins % 60;

  return (
    <Card className="border-0 shadow-sm rounded-3" style={{ backgroundColor: "var(--color-bg-card)", height: "100%", display: "flex", flexDirection: "column" }}>
      <Card.Header className="bg-white border-bottom py-3">
        <h5 style={{ color: "#1b3a5c", fontWeight: 700, margin: 0 }}>
          My Hours — {formatPeriodRange(period)}
        </h5>
      </Card.Header>
      <Card.Body className="p-0 bg-white" style={{ flexGrow: 1, overflowY: "auto" }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" style={{ color: "#1b3a5c" }} />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No hours recorded for this period.</p>
        ) : (
          <Table className="mb-0" hover>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ backgroundColor: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", padding: "12px 20px", border: "none" }}>JOB</th>
                <th className="text-end" style={{ backgroundColor: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", padding: "12px 20px", border: "none" }}>HOURS</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, i) => (
                <tr key={i}>
                  <td style={{ color: "#1b3a5c", fontWeight: 600, padding: "16px 20px", borderColor: "#e5e7eb" }}>{job.jobName}</td>
                  <td className="text-end" style={{ color: "#374151", padding: "16px 20px", borderColor: "#e5e7eb" }}>{formatHours(job.hours ?? 0, job.minutes ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
      <div className="d-flex justify-content-between align-items-center px-4 py-3 rounded-bottom" style={{ backgroundColor: "#eff6ff", borderTop: "2px solid #bfdbfe" }}>
        <span className="fw-bold" style={{ color: "#1b3a5c", fontSize: "1.1rem" }}>Total</span>
        <Badge style={{ backgroundColor: "#1b3a5c", fontSize: "0.95rem", padding: "8px 16px" }}>
          {formatHours(totalHours, leftoverMinutes)}
        </Badge>
      </div>
    </Card>
  );
}

function StaffPeriodDetails({ period }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  useEffect(() => {
    if (!period) return;
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
              if (userDoc.exists()) name = userDoc.data().name;
            } catch {
              // ignore errors and just use UID as name
            }
            const totalMins = entries.reduce((sum, e) => sum + (e.hours ?? 0) * 60 + (e.minutes ?? 0), 0);
            const hours = Math.floor(totalMins / 60);
            const minutes = totalMins % 60;
            return { uid, name, hours, minutes, jobCount: entries.length, entries };
          }),
        );
        resolved.sort((a, b) => b.hours * 60 + b.minutes - (a.hours * 60 + a.minutes));
        setStudents(resolved);
      } catch (err) {
        console.error("Error loading staff attendance:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [period]);

  async function handleStudentClick(student) {
    setSelectedStudent(student);
    setJobsLoading(true);
    try {
      const resolved = await Promise.all(
        student.entries.map(async (entry) => {
          try {
            const jobDoc = await getDoc(doc(database, "completed_events", entry.job_id));
            const jobName = jobDoc.exists() ? jobDoc.data().title : entry.job_id;
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

  const grandTotalMins = students.reduce((sum, s) => sum + s.hours * 60 + s.minutes, 0);
  const grandHours = Math.floor(grandTotalMins / 60);
  const grandMinutes = grandTotalMins % 60;
  const studentTotalMins = jobs.reduce((sum, j) => sum + (j.hours ?? 0) * 60 + (j.minutes ?? 0), 0);
  const studentTotalHours = Math.floor(studentTotalMins / 60);
  const studentTotalMinutes = studentTotalMins % 60;

  return (
    <Card className="border-0 shadow-sm rounded-3" style={{ backgroundColor: "var(--color-bg-card)", height: "100%", display: "flex", flexDirection: "column" }}>
      <Card.Header className="bg-white border-bottom py-3 d-flex align-items-center">
        {selectedStudent ? (
          <>
            <button onClick={handleBack} style={{ background: "none", border: "none", color: "#4a90d9", fontWeight: 600, padding: "0 16px 0 0", cursor: "pointer" }}>
              ‹ Back
            </button>
            <h5 style={{ color: "#1b3a5c", fontWeight: 700, margin: 0 }}>{selectedStudent.name}'s Hours — {formatPeriodRange(period)}</h5>
          </>
        ) : (
          <h5 style={{ color: "#1b3a5c", fontWeight: 700, margin: 0 }}>All Students — {formatPeriodRange(period)}</h5>
        )}
      </Card.Header>
      <Card.Body className="p-0 bg-white" style={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
        {!selectedStudent && (loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" style={{ color: "#1b3a5c" }} />
          </div>
        ) : students.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No attendance recorded for this period.</p>
        ) : (
          <Table className="mb-0" hover>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ backgroundColor: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", padding: "12px 20px", border: "none" }}>STUDENT</th>
                <th className="text-center" style={{ backgroundColor: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", padding: "12px 20px", border: "none" }}>JOBS</th>
                <th className="text-end" style={{ backgroundColor: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", padding: "12px 20px", border: "none" }}>TOTAL HRS</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.uid} style={{ cursor: "pointer" }} onClick={() => handleStudentClick(s)}>
                  <td style={{ color: "#1b3a5c", fontWeight: 600, padding: "16px 20px", borderColor: "#e5e7eb" }}>
                    {s.name}
                    <span style={{ color: "#9ca3af", fontSize: "0.8rem", marginLeft: 8 }}>view jobs ›</span>
                  </td>
                  <td className="text-center" style={{ color: "#6b7280", padding: "16px 20px", borderColor: "#e5e7eb" }}>{s.jobCount}</td>
                  <td className="text-end" style={{ color: "#374151", padding: "16px 20px", borderColor: "#e5e7eb" }}>{formatHours(s.hours, s.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ))}
        {selectedStudent && (jobsLoading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" style={{ color: "#1b3a5c" }} />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No jobs found.</p>
        ) : (
          <Table className="mb-0" hover>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ backgroundColor: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", padding: "12px 20px", border: "none" }}>JOB</th>
                <th className="text-end" style={{ backgroundColor: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: "0.85rem", padding: "12px 20px", border: "none" }}>HOURS</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, i) => (
                <tr key={i}>
                  <td style={{ color: "#1b3a5c", fontWeight: 600, padding: "16px 20px", borderColor: "#e5e7eb" }}>{job.jobName}</td>
                  <td className="text-end" style={{ color: "#374151", padding: "16px 20px", borderColor: "#e5e7eb" }} > {formatHours(job.hours ?? 0, job.minutes ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ))}
      </Card.Body>
      <div className="d-flex justify-content-between align-items-center px-4 py-3 rounded-bottom" style={{ backgroundColor: "#eff6ff", borderTop: "2px solid #bfdbfe" }}>
        {!selectedStudent ? (
          <>
            <span className="fw-bold" style={{ color: "#1b3a5c", fontSize: "1.1rem" }}>Grand Total ({students.length})</span>
            <Badge style={{ backgroundColor: "#1b3a5c", fontSize: "0.95rem", padding: "8px 16px" }} > {formatHours(grandHours, grandMinutes)}</Badge>
          </>
        ) : (
          <>
            <span className="fw-bold" style={{ color: "#1b3a5c", fontSize: "1.1rem" }}>Total</span>
            <Badge style={{ backgroundColor: "#1b3a5c", fontSize: "0.95rem", padding: "8px 16px" }} > {formatHours(studentTotalHours, studentTotalMinutes)}</Badge>
          </>
        )}
      </div>
    </Card>
  );
}

export default function PayPeriod({ user }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    async function fetchPayPeriods() {
      setLoading(true);
      try {
        const periodRef = collection(database, "periods");
        const q = query(periodRef, orderBy("enddate", "desc"));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (fetched.length > 0) {
          setPeriods(fetched);
          if (window.innerWidth >= 768) {
            setSelectedPeriod(fetched[0]);
        }
}
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
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" style={{ color: "#1b3a5c" }} />
      </div>
    );
  }

  if (!periods.length) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <p className="text-muted">No pay periods found.</p>
      </div>
    );
  }

  return (
    <Container className="py-4 py-md-5">
      <h2 style={{ color: "var(--color-primary-blue-light)", fontWeight: "700", marginBottom: 12 }}>Payment Information</h2>
      <div className="px-3 py-2 rounded-3 mb-3 d-inline-block shadow-sm" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Current Pay Period</span>
        <span style={{ fontSize: "0.95rem", color: "white", fontWeight: 700, marginLeft: 10 }}>{formatPeriodRange(periods[0])}</span>
      </div>

    {/* Mobile: drill-down view */}
      <div className="d-md-none">
        {!selectedPeriod ? (
          <Card className="border-0 shadow-sm rounded-3" style={{ backgroundColor: "var(--color-bg-card)" }}>
            <Card.Header className="bg-white border-bottom py-3">
              <h6 className="mb-0 fw-bold" style={{ color: "#1b3a5c" }}>Pay Periods</h6>
            </Card.Header>
            <div className="list-group list-group-flush rounded-bottom">
              {periods.map((p) => (
                <button
                  key={p.id}
                  className="list-group-item list-group-item-action border-0 d-flex justify-content-between align-items-center px-4 py-3 mb-2"
                  style={{ backgroundColor: "white", borderLeft: "4px solid transparent", cursor: "pointer" }}
                  onClick={() => setSelectedPeriod(p)}
                >
                  <span className="fw-semibold" style={{ color: "#4b5563", fontSize: "0.95rem" }}>
                    {formatPeriodRange(p)}
                  </span>
                  <span style={{ color: "#9ca3af", fontSize: "1.2rem", lineHeight: 1 }}>›</span>
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <div>
            <button
              onClick={() => setSelectedPeriod(null)}
              style={{ background: "none", border: "none", color: "#4a90d9", fontWeight: 600, fontSize: "1rem", marginBottom: 12, cursor: "pointer", padding: 0 }}
            >
              ‹ Back to Pay Periods
            </button>
            <div style={{ height: "calc(100vh - 120px)", minHeight: 400 }}>
              {(user?.role === "staff" || user?.role === "admin") ? (
                <StaffPeriodDetails period={selectedPeriod} />
              ) : (
                <StudentPeriodDetails period={selectedPeriod} user={user} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: side-by-side view */}
      <Row className="gy-4 d-none d-md-flex" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
        <Col md={4} lg={3} className="h-100" style={{ overflow: 'hidden' }}>
          <Card className="border-0 shadow-sm rounded-3 h-100" style={{ backgroundColor: "var(--color-bg-card)", display: "flex", flexDirection: "column" }}>
            <Card.Header className="bg-white border-bottom py-3">
              <h6 className="mb-0 fw-bold" style={{ color: "#1b3a5c" }}>Pay Periods</h6>
            </Card.Header>
            <div className="list-group list-group-flush rounded-bottom" style={{ overflowY: 'auto', flexGrow: 1 }}>
              {periods.map((p) => {
                const isSelected = selectedPeriod?.id === p.id;
                return (
                  <button
                    key={p.id}
                    className="list-group-item list-group-item-action border-0 d-flex justify-content-between align-items-center mb-2 px-4 py-3"
                    style={{
                      backgroundColor: isSelected ? "#eff6ff" : "white",
                      borderLeft: isSelected ? "4px solid #1b3a5c" : "4px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => setSelectedPeriod(p)}
                  >
                    <span className="fw-semibold" style={{ color: isSelected ? "#1b3a5c" : "#4b5563", fontSize: "0.95rem" }}>
                      {formatPeriodRange(p)}
                    </span>
                    <span style={{ color: isSelected ? "#1b3a5c" : "#9ca3af", fontSize: "1.2rem", lineHeight: 1 }}>›</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col md={8} lg={9} className="h-100" style={{ overflow: 'hidden' }}>
          {selectedPeriod && (
            (user?.role === "staff" || user?.role === "admin") ? (
              <StaffPeriodDetails period={selectedPeriod} />
            ) : (
              <StudentPeriodDetails period={selectedPeriod} user={user} />
            )
          )}
        </Col>
      </Row>
    </Container>
  );
}
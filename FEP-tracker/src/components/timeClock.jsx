import { useState, useEffect, useCallback } from "react";
import { database } from "../firebase-config";
import { doc, updateDoc } from "firebase/firestore";

function TimeClockModal({ user, jobs = [] }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [log, setLog] = useState(() => {
    try {
      const saved = localStorage.getItem(`timelog_${user?.uid}`);
      if (!saved) return [];

      const aweek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      return JSON.parse(saved, (key, val) =>
        key === "time" ? new Date(val) : val,
      ).filter((entry) => entry.time && new Date(entry.time) > aweek);
    } catch {
      return [];
    }
  });
  const [selectedJob, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist log to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`timelog_${user?.uid}`, JSON.stringify(log));
    } catch {
      // localStorage quota exceeded or unavailable — fail silently
    }
  }, [log, user?.uid]);

  const parseDate = (date) => {
    if (date?.toDate) return date.toDate();
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day); // local midnight, since the times in the firestore is in a diffrent timezone and we only care about the date part we can just parse it as local time to avoid timezone issues
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    return parseDate(a.date) - parseDate(b.date);
  });

  const upcomingJobs = sortedJobs.filter((job) => {
    const jobDate = parseDate(job.date);
    const userAttendance = job.attendance?.[user?.uid];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const isFuture = jobDate >= startOfToday;
    const notYetClockedIn = !userAttendance?.timeIn;

    return isFuture && notYetClockedIn;
  });
  const fmt = (d) => (d instanceof Date ? d : new Date(d)).toLocaleTimeString();
  const fmtDate = (d) =>
    (d instanceof Date ? d : new Date(d)).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const lastEntry = log[log.length - 1];
  const isClockedIn = lastEntry?.type === "IN";

  const clockIn = useCallback(async () => {
    if (!selectedJob || loading) return;
    setError(null);
    setLoading(true);
    try {
      await updateDoc(doc(database, "upcoming_events", selectedJob.id), {
        [`attendance.${user.uid}`]: {
          timeIn: new Date(),
          timeOut: null,
        },
      });
      setLog((prev) => [
        ...prev,
        {
          type: "IN",
          time: new Date(),
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
        },
      ]);
      setOpen(false);
    } catch (err) {
      console.error("Clock-in failed:", err);
      setError(
        "Failed to clock in. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedJob, loading, user]);

  const clockOut = useCallback(async () => {
    if (!lastEntry || loading) return;
    setError(null);
    setLoading(true);
    try {
      await updateDoc(doc(database, "upcoming_events", lastEntry.jobId), {
        [`attendance.${user.uid}.timeOut`]: new Date(),
      });
      setLog((prev) => [
        ...prev,
        {
          type: "OUT",
          time: new Date(),
          jobId: lastEntry.jobId,
          jobTitle: lastEntry.jobTitle,
        },
      ]);
      setOpen(false);
    } catch (err) {
      console.error("Clock-out failed:", err);
      setError(
        "Failed to clock out. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [lastEntry, loading, user]);

  const openModal = () => {
    setSelected(null);
    setError(null);
    setOpen(true);
  };

  const closeModal = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
  };

  return (
    <>
      {/* ── Card ── */}
      <div className="d-flex flex-column align-items-center justify-content-center p-3">
        <div
          className="card shadow-sm p-4 text-center"
          style={{ maxWidth: 380, width: "100%" }}
        >
          <h5 className="fw-semibold mb-1">Student Time Clock</h5>
          <p className="text-muted small mb-3">{fmtDate(time)}</p>
          <div
            className="display-6 fw-bold font-monospace mb-3"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {fmt(time)}
          </div>

          <span
            className={`badge mb-1 fs-6 ${isClockedIn ? "bg-success" : "bg-secondary"}`}
          >
            {isClockedIn ? "● Clocked In" : "○ Clocked Out"} at{" "}
            {lastEntry ? fmt(lastEntry.time) : "N/A"}
          </span>
          {isClockedIn && (
            <p className="text-muted small mb-2">{lastEntry.jobTitle}</p>
          )}

          <button className="btn btn-primary w-100 mt-2" onClick={openModal}>
            Clock In / Out
          </button>
        </div>

        {/* ── Log ── */}
        {log.length > 0 && (
          <div className="card shadow-sm mt-4" style={{ maxWidth: 380, width: "100%" }}>
            <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
              <span>Time Log</span>
              <small className="text-muted">{log.length} entries</small>
            </div>

            {/* Wrap the list in this scrollable div */}
            <div style={{
              maxHeight: "250px",
              overflowY: "auto",
              scrollbarWidth: "thin"
            }}>
              <ul className="list-group list-group-flush">
                {[...log].reverse().map((e, i) => (
                    <li
                        key={i}
                        className="list-group-item d-flex justify-content-between align-items-center"
                        style={{ padding: "0.75rem 1rem" }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${e.type === "IN" ? "bg-success" : "bg-danger"}`} style={{ minWidth: "45px" }}>
                          {e.type}
                        </span>
                        <span className="small text-truncate" style={{ maxWidth: "150px" }}>
                          {e.jobTitle}
                        </span>
                      </div>
                      <span className="font-monospace small text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmt(e.time)}
                      </span>
                    </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="modal-backdrop fade show"
          style={{ zIndex: 1040 }}
          onClick={closeModal}
        />
      )}

      {/* ── Modal ── */}
      <div
        className={`modal fade ${open ? "show d-block" : ""}`}
        style={{ zIndex: 1050 }}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeClockModalTitle"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content shadow-lg">
            <div className="modal-header">
              <h5 className="modal-title" id="timeClockModalTitle">
                Log Time
              </h5>
              <button
                className="btn-close"
                onClick={closeModal}
                disabled={loading}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              <p className="text-muted small text-center mb-1">
                {fmtDate(time)}
              </p>
              <div
                className="display-5 fw-bold font-monospace text-center mb-3"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {fmt(time)}
              </div>

              <span
                className={`badge fs-6 d-block text-center mb-3 ${isClockedIn ? "bg-success" : "bg-secondary"}`}
              >
                {isClockedIn
                  ? `● Clocked In — ${lastEntry.jobTitle}`
                  : "○ Currently Clocked Out"}{" "}
                at {lastEntry ? fmt(lastEntry.time) : "N/A"}
              </span>

              {/* Error alert */}
              {error && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {error}
                </div>
              )}

              {/* Clock Out path */}
              {isClockedIn ? (
                <div className="d-grid">
                  <button
                    className="btn btn-danger btn-lg"
                    onClick={clockOut}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Clocking Out…
                      </>
                    ) : (
                      `Clock Out of ${lastEntry.jobTitle}`
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <p className="fw-semibold mb-2 text-center small text-uppercase text-muted">
                    Select a Job
                  </p>

                  {upcomingJobs.length === 0 ? (
                    <p className="text-center text-muted small">
                      No upcoming jobs available.
                    </p>
                  ) : (
                    <div className="list-group mb-3">
                      {upcomingJobs.map((job) => {
                        const isSelected = selectedJob?.id === job.id;
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => setSelected(job)}
                            disabled={loading}
                            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                              isSelected ? "active" : ""
                            }`}
                          >
                            <span className="fw-semibold">{job.title}</span>
                            <span
                              className={`small ${isSelected ? "text-white" : "text-muted"}`}
                            >
                              {new Date(job.date).toString().slice(0, 10)} at
                              new {job.startTime}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="d-grid">
                    <button
                      className="btn btn-success btn-lg"
                      disabled={!selectedJob || loading}
                      onClick={clockIn}
                    >
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                          Clocking In…
                        </>
                      ) : selectedJob ? (
                        `Clock In — ${selectedJob.title}`
                      ) : (
                        "Select a Job to Clock In"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TimeClockModal;

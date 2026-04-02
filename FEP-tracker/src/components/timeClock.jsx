import { useState, useEffect } from "react";
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
function TimeClockModal({ user,jobs }) {
  const [open, setOpen]           = useState(false);
  const [time, setTime]           = useState(new Date());
  const [log, setLog]             = useState([]);       
  const [selectedJob, setSelected] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // sort jobs by earliest date
  const sortedJobs = [...jobs].sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return da - db;
  });

  const fmt      = (d) => d.toLocaleTimeString();
  const fmtDate  = (d) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const fmtShort = (d) => {
    const date = d?.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
           " · " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const lastEntry   = log[log.length - 1];
  const isClockedIn = lastEntry?.type === "IN";

  const clockIn = () => {
    if (!selectedJob) return;
    setLog(prev => [...prev, { type: "IN",  time: new Date(), jobId: selectedJob.id, jobTitle: selectedJob.title }]);
    setOpen(false);
    const id = selectedJob.id;


  };

  const clockOut = () => {
    setLog(prev => [...prev, { type: "OUT", time: new Date(), jobId: lastEntry.jobId, jobTitle: lastEntry.jobTitle }]);
    setOpen(false);
  };

  const openModal = () => {
    setSelected(null);
    setOpen(true);
  };

  return (
    <>

      {/* ── Card ── */}
      <div className="d-flex flex-column align-items-center justify-content-center p-3">
        <div className="card shadow-sm p-4 text-center" style={{ maxWidth: 380, width: "100%" }}>
          <h5 className="fw-semibold mb-1">Student Time Clock</h5>
          <p className="text-muted small mb-3">{fmtDate(time)}</p>
          <div className="display-6 fw-bold font-monospace mb-3">{fmt(time)}</div>

          <span className={`badge mb-1 fs-6 ${isClockedIn ? "bg-success" : "bg-secondary"}`}>
            {isClockedIn ? "● Clocked In" : "○ Clocked Out"} at {lastEntry ? fmt(lastEntry.time) : "N/A"}
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
            <div className="card-header fw-semibold">Time Log</div>
            <ul className="list-group list-group-flush">
              {[...log].reverse().map((e, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${e.type === "IN" ? "bg-success" : "bg-danger"}`}>{e.type}</span>
                    <span className="small">{e.jobTitle}</span>
                  </div>
                  <span className="font-monospace small text-muted">{fmt(e.time)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Backdrop ── */}
      {open && (
        <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setOpen(false)} />
      )}

      {/* ── Modal ── */}
      <div className={`modal fade ${open ? "show d-block" : ""}`} style={{ zIndex: 1050 }} tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content shadow-lg">

            <div className="modal-header">
              <h5 className="modal-title">Log Time</h5>
              <button className="btn-close" onClick={() => setOpen(false)} />
            </div>

            <div className="modal-body">
              <p className="text-muted small text-center mb-1">{fmtDate(time)}</p>
              <div className="display-5 fw-bold font-monospace text-center mb-3">{fmt(time)}</div>

              <span className={`badge fs-6 d-block text-center mb-3 ${isClockedIn ? "bg-success" : "bg-secondary"}`}>
                {isClockedIn ? `● Clocked In — ${lastEntry.jobTitle}` : "○ Currently Clocked Out"} at {lastEntry ? fmt(lastEntry.time) : "N/A"}
              </span>

              {/* Clock Out path — no job selection needed */}
              {isClockedIn ? (
                <div className="d-grid">
                  <button className="btn btn-danger btn-lg" onClick={clockOut}>
                    Clock Out of {lastEntry.jobTitle}
                  </button>
                </div>
              ) : (
                <>
                  <p className="fw-semibold mb-2 text-center small text-uppercase text-muted letter-spacing">Select a Job</p>
                  <div className="list-group mb-3">
                    {sortedJobs.map(job => {
                      const isSelected = selectedJob?.id === job.id;
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => setSelected(job)}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${isSelected ? "active" : ""}`}
                        >
                          <span className="fw-semibold">{job.title}</span>
                          <span className={`small ${isSelected ? "text-white" : "text-muted"}`}>
                            {fmtShort(job.date)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="d-grid">
                    <button
                      className="btn btn-success btn-lg"
                      disabled={!selectedJob}
                      onClick={clockIn}
                    >
                      {selectedJob ? `Clock In — ${selectedJob.title}` : "Select a Job to Clock In"}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-secondary w-100" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TimeClockModal;
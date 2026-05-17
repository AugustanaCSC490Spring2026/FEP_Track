import { useEffect, useState, useRef, useCallback } from "react";
import { database } from "../firebase-config";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { startOfWeek, addDays, format, subWeeks, addWeeks } from "date-fns";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import EventCard from "../components/event-card";
import { GoogleAuthProvider } from "firebase/auth";
import JobManagementModal from "../components/JobManagementModal";
import Select from "react-select";
import { timeFormat } from "../Utils/timeUtils";
import JobForms from "../components/Jobform";

function Home({ user }) {
  const [events, setEvents] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(false);
  const isAdmin = user?.role === "admin";
  const jobFormRef = useRef();

  useEffect(() => {
    const loadPref = async () => {
      if (!user?.uid) return;
      const userRef = doc(database, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setShowGoogleCalendar(data.preferences?.showGoogleCalendar ?? false);
      }
    };
    loadPref();
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isJobFormOpen, setisJobFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsListView(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const START_HOUR = 6;
  const END_HOUR = 24;
  const HOUR_HEIGHT = 60;

  const GOOGLE_COLORS = {
    1: "#a4bdfc",
    2: "#7ae7bf",
    3: "#dbadff",
    4: "#ff887c",
    5: "#fbd75b",
    6: "#ffb878",
    7: "#46d6db",
    8: "#e1e1e1",
    9: "#5484ed",
    10: "#51b886",
    11: "#dc2127",
  };

  const DEFAULT_GOOGLE_COLOR = "#46d6db";

  const handlePrevWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const handleToday = () =>
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(
        collection(database, "upcoming_events"),
      );
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setEvents(data);

      setSelectedEvent((prev) => {
        if (!prev) return null;
        const freshData = data.find((e) => e.id === prev.id);
        return freshData ? { ...freshData } : null;
      });
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const FUNCTIONS_BASE = "https://us-central1-fep-tracker.cloudfunctions.net";

  const getValidAccessToken = async (uid) => {
    const cachedToken = sessionStorage.getItem("google_access_token");
    const cachedExpiry = sessionStorage.getItem("google_token_expiry");

    if (
      cachedToken &&
      cachedExpiry &&
      Date.now() < Number(cachedExpiry) - 60_000
    ) {
      return cachedToken;
    }

    const res = await fetch(`${FUNCTIONS_BASE}/refreshGoogleToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid }),
    });

    if (!res.ok) {
      await updateDoc(doc(database, "users", uid), {
        googleCalendarConnected: false,
        "preferences.showGoogleCalendar": false,
      });
      throw new Error(
        "Failed to refresh token — please reconnect Google Calendar",
      );
    }

    const { access_token, expires_in } = await res.json();
    sessionStorage.setItem("google_access_token", access_token);
    sessionStorage.setItem(
      "google_token_expiry",
      Date.now() + expires_in * 1000,
    );

    return access_token;
  };

  const connectGoogleCalendar = () => {
    const clientId =
      "330729366554-l1mthkkksop6r1iehp912l1hr500um42.apps.googleusercontent.com";
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set(
      "redirect_uri",
      `${window.location.origin}/oauth-callback`,
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/calendar.events",
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    window.location.href = authUrl.toString();
  };

  useEffect(() => {
    if (!showGoogleCalendar || !user) {
      setGoogleEvents([]);
      return;
    }

    const fetchGoogleCalendar = async () => {
      let token;
      try {
        token = await getValidAccessToken(user.uid);
      } catch (err) {
        console.error("Could not get access token:", err);
        setShowGoogleCalendar(false);
        await updateDoc(doc(database, "users", user.uid), {
          "preferences.showGoogleCalendar": false,
        });
        return;
      }

      const timeMin = currentWeekStart.toISOString();
      const timeMax = addDays(currentWeekStart, 7).toISOString();

      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const data = await response.json();

        if (data.error?.code === 401) {
          sessionStorage.removeItem("google_access_token");
          sessionStorage.removeItem("google_token_expiry");
          setShowGoogleCalendar(false);
          return;
        }

        const formatted = (data.items || [])
          .map((item) => {
            const start = new Date(item.start.dateTime || item.start.date);
            const end = new Date(item.end.dateTime || item.end.date);

            return {
              id: item.id,
              title: item.summary?.trim(),
              time: `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`,
              date: format(start, "yyyy-MM-dd"),
              startTime: format(start, "HH:mm"),
              endTime: format(end, "HH:mm"),
              isGoogleEvent: true,
              color: GOOGLE_COLORS[item.colorId] || DEFAULT_GOOGLE_COLOR,
            };
          })
          .filter((googleEvent) => {
            return !events.some((localEvent) => {
              return (
                localEvent.title?.trim().toLowerCase() ===
                  googleEvent.title?.trim().toLowerCase() &&
                localEvent.date === googleEvent.date &&
                localEvent.startTime === googleEvent.startTime &&
                localEvent.endTime === googleEvent.endTime
              );
            });
          });

        setGoogleEvents(formatted);
      } catch (err) {
        console.error("Google Calendar fetch failed:", err);
      }
    };

    fetchGoogleCalendar();
  }, [currentWeekStart, user, showGoogleCalendar, events]);

  const handleApply = async (uid, eventId) => {
    try {
      const eventRef = doc(database, "upcoming_events", eventId);

      await updateDoc(eventRef, {
        pending_students: arrayUnion(uid),
      });

      setEvents((prevEvents) =>
        prevEvents.map((event) => {
          if (event.id === eventId) {
            return {
              ...event,
              pending_students: [...(event.pending_students || []), uid],
            };
          }
          return event;
        }),
      );

      setSelectedEvent((prev) => {
        if (!prev || prev.id !== eventId) return prev;
        return {
          ...prev,
          pending_students: [...(prev.pending_students || []), uid],
        };
      });

      alert("Application submitted! Pending admin approval.");
    } catch (error) {
      console.error("Error applying for job:", error);
      alert("Failed to apply. Please try again.");
    }
  };

  const getEventPosition = (event) => {
    if (!event.time) return {};
    const [start, end] = event.time.split(" – ");
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    const viewStartTotal = START_HOUR * 60;
    const topPosition = ((startTotal - viewStartTotal) / 60) * HOUR_HEIGHT;
    const duration = endTotal - startTotal;
    const height = (duration / 60) * HOUR_HEIGHT;
    return { top: topPosition, height: height };
  };

  const getEventColor = (event, user) => {
    const blue = "#0d6efd";
    const green = "#198754";
    const yellow = "#ffc107";
    const red = "#dc3545";

    const isAdminOrStaff = isAdmin || user?.role === "staff";
    const approvedStudents = event.students || [];
    const pendingStudents = event.pending_students || [];
    const isFull = approvedStudents.length >= event.student_cap;

    if (isAdminOrStaff) {
      if (pendingStudents.length > 0) return yellow;
      if (isFull) return green;
      return blue;
    } else {
      if (approvedStudents.includes(user?.uid)) return green;
      if (pendingStudents.includes(user?.uid)) return yellow;
      if (isFull) return red;
      return blue;
    }
  };

  const renderEventsForDay = (day) => {
    const formattedDay = format(day, "yyyy-MM-dd");

    const dayJobs = events
      .filter((e) => {
        if (!e.date) return false;
        const [year, month, dateNum] = e.date.split("-").map(Number);
        const eventDate = new Date(year, month - 1, dateNum);
        return format(eventDate, "yyyy-MM-dd") === formattedDay;
      })
      .sort((a, b) => a.time.localeCompare(b.time));

    const jobElements = dayJobs.map((event, index) => {
      const pos = getEventPosition(event);
      const overlaps = dayJobs.filter((other) => {
        if (event.id === other.id) return false;
        const [sA, eA] = event.time
          .split(" – ")
          .map((t) => parseInt(t.replace(":", "")));
        const [sB, eB] = other.time
          .split(" – ")
          .map((t) => parseInt(t.replace(":", "")));
        return sA < eB && eA > sB;
      });

      const isOverlapping = overlaps.length > 0;
      const width = isOverlapping ? 90 / (overlaps.length + 1) : 90;
      const leftOffset = isOverlapping
        ? (index % (overlaps.length + 1)) * width
        : 0;

      if (pos.top < 0 && pos.top + pos.height <= 0) return null;

      const cardColor = getEventColor(event, user);
      const textColor = cardColor === "#ffc107" ? "#000" : "white";

      return (
        <div
          key={event.id}
          onClick={() => setSelectedEvent(event)}
          style={{
            position: "absolute",
            left: `${leftOffset}%`,
            width: `${width}%`,
            top: pos.top,
            height: pos.height,
            background: cardColor,
            color: textColor,
            borderRadius: "4px",
            padding: "4px",
            fontSize: "11px",
            overflow: "hidden",
            zIndex: 5,
            border: "1px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            cursor: "pointer",
          }}
        >
          <strong>{event.title}</strong>
          <div style={{ fontSize: "10px" }}>
            {timeFormat(event.startTime)} - {timeFormat(event.endTime)}
          </div>
        </div>
      );
    });

    const dayGoogleEvents = googleEvents.filter((e) => {
      const eventDate =
        typeof e.date === "string" ? e.date : format(e.date, "yyyy-MM-dd");
      return eventDate === formattedDay;
    });

    const googleElements = dayGoogleEvents.map((event, index) => {
      const pos = getEventPosition(event);

      const overlaps = dayGoogleEvents.filter((other) => {
        if (event.id === other.id) return false;
        const [sA, eA] = event.time
          .split(" – ")
          .map((t) => parseInt(t.replace(":", "")));
        const [sB, eB] = other.time
          .split(" – ")
          .map((t) => parseInt(t.replace(":", "")));
        return sA < eB && eA > sB;
      });

      const isOverlapping = overlaps.length > 0;
      const width = isOverlapping ? 90 / (overlaps.length + 1) : 90;
      const leftOffset = isOverlapping
        ? (index % (overlaps.length + 1)) * width
        : 0;

      if (pos.top < 0 && pos.top + pos.height <= 0) return null;

      return (
        <div
          key={event.id}
          style={{
            position: "absolute",
            left: `${leftOffset}%`,
            width: `${width}%`,
            top: pos.top,
            height: pos.height,
            background: `${event.color}80`,
            color: "#000000",
            borderRadius: "4px",
            padding: "4px",
            fontSize: "10px",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <strong>{event.title}</strong>
        </div>
      );
    });

    if (showGoogleCalendar) {
      return [...googleElements, ...jobElements];
    } else {
      return [...jobElements];
    }
  };

  const GoogleCalendarToggle = ({ showGoogleCalendar, onToggle, isMobile }) => (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: "6px",
        border: "1px solid #2563eb",
        fontSize: isMobile ? "12px" : "13px",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Form.Check
        type="switch"
        id={`google-calendar-toggle${isMobile ? "-mobile" : ""}`}
        label={isMobile ? " Google Cal" : " Show Google Calendar"}
        checked={showGoogleCalendar}
        onChange={onToggle}
        style={{ cursor: "pointer", marginBottom: 0, color: "#2563eb" }}
      />
    </div>
  );

  const handleGoogleCalendarToggle = async () => {
    if (!showGoogleCalendar) {
      const userSnap = await getDoc(doc(database, "users", user.uid));
      const alreadyConnected = userSnap.data()?.googleCalendarConnected;
      if (alreadyConnected) {
        setShowGoogleCalendar(true);
        await updateDoc(doc(database, "users", user.uid), {
          "preferences.showGoogleCalendar": true,
        });
      } else {
        await connectGoogleCalendar();
      }
    } else {
      setShowGoogleCalendar(false);
      await updateDoc(doc(database, "users", user.uid), {
        "preferences.showGoogleCalendar": false,
      });
    }
  };

  const handleToggleJobForm = useCallback(() => {
    if (isJobFormOpen) {
      jobFormRef.current.closeForm();
    } else {
      setEditingEvent(null);
      jobFormRef.current.resetForm();
      jobFormRef.current.openForm();
    }
  }, [isJobFormOpen]);

  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => i + START_HOUR,
  );

  if (loading) return <p className="text-center mt-5">Loading ...</p>;

  const handleOpenManage = (event) => {
    setSelectedEvent(event);
    setShowManageModal(true);
  };

  return (
    <div
      style={{
        padding: "20px",
        height: "calc(100vh - 70px)",
        overflowY: "auto",
      }}
    >
      <JobForms
        ref={jobFormRef}
        onOpenChange={setisJobFormOpen}
        user={user}
        fetchEvents={fetchEvents}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
      />
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 540 }}
          >
            <EventCard
              event={selectedEvent}
              user={user}
              status="Upcoming"
              onEdit={() => jobFormRef.current?.handleEditEvent(selectedEvent)}
              onManage={handleOpenManage}
              onRefresh={fetchEvents}
              onApply={() => handleApply(user.uid, selectedEvent.id)}
            />
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 20px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#555",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="py-3">
        {/* Desktop layout */}
        <div className="d-none d-md-flex justify-content-between align-items-center">
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={handlePrevWeek}>
              &larr; Previous Week
            </Button>
            <Button variant="outline-secondary" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline-primary" onClick={handleNextWeek}>
              Next Week &rarr;
            </Button>
          </div>
          <div className="text-center">
            <h2 className="mb-0">Schedule</h2>
            <span>Week of {format(currentWeekStart, "MMMM do, yyyy")}</span>
          </div>
          <div className="d-flex gap-2 align-items-center">
            {!isListView && (
              <GoogleCalendarToggle
                showGoogleCalendar={showGoogleCalendar}
                onToggle={handleGoogleCalendarToggle}
              />
            )}
            <Button
              variant={isListView ? "primary" : "outline-primary"}
              onClick={() => setIsListView(!isListView)}
            >
              {isListView ? "Calendar View" : "List View"}
            </Button>
            {isAdmin && (
              <Button
                variant={isJobFormOpen ? "outline-secondary" : "primary"}
                className="py-2 shadow-sm"
                onClick={handleToggleJobForm}
              >
                {isJobFormOpen ? "✕ Cancel" : "+ Add Job"}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="d-flex d-md-none flex-column align-items-center gap-2">
          <h5 className="mb-0">Schedule</h5>
          <span style={{ fontSize: "13px" }}>
            Week of {format(currentWeekStart, "MMMM do, yyyy")}
          </span>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-primary" onClick={handlePrevWeek}>
              &larr;
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={handleToday}>
              Today
            </Button>
            <Button size="sm" variant="outline-primary" onClick={handleNextWeek}>
              &rarr;
            </Button>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap justify-content-center">
            {!isListView && (
              <GoogleCalendarToggle
                showGoogleCalendar={showGoogleCalendar}
                onToggle={handleGoogleCalendarToggle}
                isMobile={true}
              />
            )}
            {isAdmin && (
              <Button
                variant={isJobFormOpen ? "outline-secondary" : "primary"}
                className="shadow-sm"
                onClick={handleToggleJobForm}
              >
                {isJobFormOpen ? "✕ Cancel" : "+ Add Job"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isListView ? (
        <div>
          {Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(currentWeekStart, i);
            const formattedDay = format(day, "yyyy-MM-dd");
            const dayJobs = events
              .filter((e) => {
                if (!e.date) return false;
                const [year, month, dateNum] = e.date.split("-").map(Number);
                const eventDate = new Date(year, month - 1, dateNum);
                return format(eventDate, "yyyy-MM-dd") === formattedDay;
              })
              .sort((a, b) => a.time.localeCompare(b.time));

            return (
              <div key={i} className="mb-3">
                <div
                  style={{
                    background: "#1e3a5f",
                    color: "#ffffff",
                    padding: "8px 12px",
                    fontWeight: "bold",
                    borderRadius: "6px 6px 0 0",
                    borderBottom: "2px solid #3a6ea8",
                    fontSize: "14px",
                  }}
                >
                  {format(day, "EEEE, MMMM do, yyyy")}
                </div>
                {dayJobs.length === 0 ? (
                  <div
                    style={{
                      padding: "12px",
                      color: "#aaa",
                      fontSize: "14px",
                      border: "1px solid #333",
                      borderTop: "none",
                      borderRadius: "0 0 6px 6px",
                      background: "#111827",
                    }}
                  >
                    No jobs posted
                  </div>
                ) : (
                  dayJobs.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        padding: "12px",
                        border: "1px solid #333",
                        borderTop: "none",
                        cursor: "pointer",
                        background: getEventColor(event, user),
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "15px",
                            color:
                              getEventColor(event, user) === "#ffc107"
                                ? "#000000"
                                : "#ffffff",
                          }}
                        >
                          {event.title}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color:
                              getEventColor(event, user) === "#ffc107"
                                ? "#333333"
                                : "rgba(255,255,255,0.8)",
                          }}
                        >
                          {timeFormat(event.startTime)} - {timeFormat(event.endTime)} &bull; {event.location || "TBD"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Card style={{ flex: 1, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "50px repeat(7, 1fr)",
              height: "100%",
            }}
          >
            <div style={{ marginTop: "10px" }}>
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    height: HOUR_HEIGHT,
                    borderBottom: "1px solid #eee",
                    fontSize: "12px",
                    textAlign: "right",
                    paddingRight: 10,
                    lineHeight: `${HOUR_HEIGHT}px`,
                  }}
                >
                  {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
                </div>
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => {
              const day = addDays(currentWeekStart, i);
              return (
                <div
                  key={i}
                  style={{ borderLeft: "1px solid #eee", position: "relative" }}
                >
                  <div
                    style={{
                      height: "40px",
                      background: "#f8f9fa",
                      textAlign: "center",
                      fontWeight: "bold",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    {format(day, "EEE")}
                    <div style={{ fontSize: "10px" }}>
                      {format(day, "MM/dd")}
                    </div>
                  </div>
                  <div style={{ position: "relative" }}>
                    {hours.map((h) => (
                      <div
                        key={h}
                        style={{
                          height: HOUR_HEIGHT,
                          borderBottom: "1px solid #f1f1f1",
                        }}
                      />
                    ))}
                    {renderEventsForDay(day)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <JobManagementModal
        show={showManageModal}
        onHide={() => setShowManageModal(false)}
        event={selectedEvent}
        onRefresh={fetchEvents}
      />
    </div>
  );
}

export default Home;
import { useEffect, useState } from "react";
import { database } from "../firebase-config";
import { collection, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { startOfWeek, addDays, format, subWeeks, addWeeks } from "date-fns";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import EventCard from "../components/event-card";

function Home({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const START_HOUR = 6;
  const END_HOUR = 24;
  const HOUR_HEIGHT = 60;

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    const loadEvents = async () => {
      const snap = await getDocs(collection(database, "upcoming_events"));
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(data);
      setLoading(false);
    };
    loadEvents();
  }, []);

  const handleApply = async (uid, eventId) => {
    console.log("handleApply called with:", uid, eventId);
    await updateDoc(doc(database, "upcoming_events", eventId), {
      students: arrayUnion(uid),
    });
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? { ...e, students: [...(e.students ?? []), uid] }
          : e
      )
    );
    setSelectedEvent(prev =>
      prev?.id === eventId
        ? { ...prev, students: [...(prev.students ?? []), uid] }
        : prev
    );
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

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

  const renderEventsForDay = (day) => {
    const dayEvents = events.filter((e) => {
      if (!e.date) return false;
      const [year, month, date] = e.date.split("-").map(Number);
      const eventDate = new Date(year, month - 1, date);
      return format(eventDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
    }).sort((a, b) => a.time.localeCompare(b.time));

    return dayEvents.map((event, index) => {
      const pos = getEventPosition(event);
      const overlaps = dayEvents.filter((other) => {
        if (event.id === other.id) return false;
        const [sA, eA] = event.time.split(" – ").map(t => parseInt(t.replace(':', '')));
        const [sB, eB] = other.time.split(" – ").map(t => parseInt(t.replace(':', '')));
        return sA < eB && eA > sB;
      });

      const isOverlapping = overlaps.length > 0;
      const width = isOverlapping ? 90 / (overlaps.length + 1) : 90;
      const leftOffset = isOverlapping ? (index % (overlaps.length + 1)) * width : 0;

      if (pos.top < 0 && (pos.top + pos.height) <= 0) return null;

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
            background: isOverlapping ? "#3182ce" : "#0d6efd",
            color: "white",
            borderRadius: "4px",
            padding: "4px",
            fontSize: "11px",
            overflow: "hidden",
            zIndex: 10,
            border: "1px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            cursor: "pointer",
          }}
        >
          <strong>{event.title}</strong>
          <div style={{ fontSize: "10px" }}>{event.time}</div>
        </div>
      );
    });
  };

  if (loading) return <p className="text-center mt-5">Loading events...</p>;

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 70px)", overflowY: "auto" }}>

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
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 540 }}>
            <EventCard
              event={selectedEvent}
              user={user}
              onCallBack={handleApply}
              onEdit={() => {}}
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

      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="outline-primary" onClick={handlePrevWeek}>&larr; Previous Week</Button>
        <div className="text-center">
          <h2 className="mb-0">All Jobs</h2>
          <span className="text-center">Week of {format(currentWeekStart, "MMMM do, yyyy")}</span>
        </div>
        <div>
          <Button variant="outline-secondary" className="me-2" onClick={handleToday}>Today</Button>
          <Button variant="outline-primary" onClick={handleNextWeek}>Next Week &rarr;</Button>
        </div>
      </div>

      <Card style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", height: "100%" }}>

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
              <div key={i} style={{ borderLeft: "1px solid #eee", position: "relative" }}>
                <div style={{
                  height: "40px",
                  background: "#f8f9fa",
                  textAlign: "center",
                  fontWeight: "bold",
                  borderBottom: "2px solid #ddd",
                  padding: "2px",
                }}>
                  {format(day, "EEE")}
                  <div style={{ fontSize: "10px" }}>{format(day, "MM/dd")}</div>
                </div>

                <div style={{ position: "relative" }}>
                  {hours.map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: "1px solid #f1f1f1" }} />
                  ))}
                  {renderEventsForDay(day)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default Home;
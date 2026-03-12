import { useEffect, useState } from "react";
import { database } from "../firebase-config";
import { collection, getDocs } from "firebase/firestore";
import { startOfWeek, addDays, format } from "date-fns";
import Card from "react-bootstrap/Card";

function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const START_HOUR = 6; 
  const END_HOUR = 24;  
  const HOUR_HEIGHT = 60; 

  useEffect(() => {
    const loadEvents = async () => {
      const snap = await getDocs(collection(database, "events"));
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(data);
      setLoading(false);
    };
    loadEvents();
  }, []);

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

    return {
      top: topPosition,
      height: height,
    };
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
      

      const overlaps = dayEvents.filter((other, idx) => {
        if (event.id === other.id) return false;
        
        const [startA, endA] = event.time.split(" – ");
        const [startB, endB] = other.time.split(" – ");
        
        const sA = parseInt(startA.replace(':', ''));
        const eA = parseInt(endA.replace(':', ''));
        const sB = parseInt(startB.replace(':', ''));
        const eB = parseInt(endB.replace(':', ''));

        return sA < eB && eA > sB;
      });

      const isOverlapping = overlaps.length > 0;
      const width = isOverlapping ? 90 / (overlaps.length + 1) : 90;
      
      const leftOffset = isOverlapping ? (index % (overlaps.length + 1)) * width : 0;

      if (pos.top < 0 && (pos.top + pos.height) <= 0) return null;

      return (
        <div
          key={event.id}
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
            transition: "all 0.2s ease"
          }}
          title={`${event.title}: ${event.time}`}
        >
          <div style={{ fontWeight: "bold", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
            {event.title}
          </div>
          <div style={{ fontSize: "10px" }}>{event.time}</div>
        </div>
      );
    });
  };

  if (loading) return <p className="text-center mt-5">Loading events...</p>;

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 70px)", overflowY: "auto" }}>
      <h2 className="text-center mb-4">All Jobs</h2>

      <Card style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", height: "100%" }}>
          
          <div style={{ marginTop: "40px" }}>
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
            const day = addDays(weekStart, i);

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
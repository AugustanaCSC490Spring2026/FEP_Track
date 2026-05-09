import { useEffect, useState, useRef } from "react";
import { database } from "../firebase-config";
import JobForms from "../components/Jobform";
import { collection, query, getDocs, deleteDoc, doc } from "firebase/firestore";
import EventCard from "../components/event-card";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import JobManagementModal from "../components/JobManagementModal";
import FilterPanel from "../components/FilterPanel";
import ShiftDetails from "../components/ShiftDetails";
import ConfirmJobModal from "../components/ConfirmJobModal";

function Dashboard({ user }) {
  const [isJobFormOpen, setisJobFormOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("Upcoming");
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [completedEventDetails, setCompletedEventDetails] = useState(null);
  const [filters, setFilters] = useState({
    searchTitle: "",
    filterDepartment: "All",
    filterSupervisor: "All",
    filterBuilding: "All",
    filterAvailability: "All",
    filterPending: "All",
  });

  const jobFormRef = useRef();
  const isAdmin = user?.role === "admin";

  const shiftDetailsRef = useRef();
  const confirmJobRef = useRef();

  const collectionMap = {
    Upcoming: "upcoming_events",
    "Pending Approval": "pending_events",
    Completed: "completed_events",
  };
  const tabNames = Object.keys(collectionMap);

  const fetchEvents = async () => {
    setLoading(true);
    const q = query(collection(database, collectionMap[currentTab]));
    try {
      const snap = await getDocs(q);
      let fetchedEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      fetchedEvents.sort((a, b) => {
        if (!a.date || a.date === "TBD") return 1;
        if (!b.date || b.date === "TBD") return -1;
        const dateTimeA = new Date(`${a.date}T${a.startTime || "00:00"}`);
        const dateTimeB = new Date(`${b.date}T${b.startTime || "00:00"}`);
        let diff = currentTab === "Upcoming" ? dateTimeA - dateTimeB : dateTimeB - dateTimeA;
        if (diff === 0) {
          const endA = a.endTime || "00:00";
          const endB = b.endTime || "00:00";
          return currentTab === "Upcoming" ? endA.localeCompare(endB) : endB.localeCompare(endA);
        }
        return diff;
      });

      setEvents(fetchedEvents);
      setSelectedEvent((prev) => {
        if (!prev) return null;
        const freshData = fetchedEvents.find((e) => e.id === prev.id);
        return freshData ? { ...freshData } : null;
      });
    } catch (error) {
      console.error("Error fetching/sorting events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [currentTab]);

  const deleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      await deleteDoc(doc(database, "upcoming_events", id));
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelectedEvent(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters({
    searchTitle: "",
    filterDepartment: "All",
    filterSupervisor: "All",
    filterBuilding: "All",
    filterAvailability: "All",
    filterPending: "All",
  });

  const { searchTitle, filterDepartment, filterSupervisor, filterBuilding, filterAvailability, filterPending } = filters;

  const filteredEvents = events.filter((event) => {
    const matchesTitle = event.title.toLowerCase().includes(searchTitle.toLowerCase());
    const matchesBuilding = filterBuilding === "All" || event.location === filterBuilding;
    const matchesSupervisor = filterSupervisor === "All" || event.supervisor === filterSupervisor;
    const matchesDepartment = filterDepartment === "All" || event.department === filterDepartment;
    const isFull = (event.students?.length || 0) >= event.student_cap;
    const matchesAvailability =
      filterAvailability === "All" ||
      (filterAvailability === "Full" && isFull) ||
      (filterAvailability === "Available" && !isFull);
    const hasPending = event.pending_students && event.pending_students.length > 0;
    const matchesPending =
      filterPending === "All" ||
      (filterPending === "Has Pending" && hasPending) ||
      (filterPending === "No Pending" && !hasPending);
    return matchesTitle && matchesBuilding && matchesSupervisor && matchesAvailability && matchesDepartment && matchesPending;
  });

  const handleOpenManage = (event) => {
    setSelectedEvent(event);
    setShowManageModal(true);
  };

  const handleViewCompletedDetails = (event) => {
    setCompletedEventDetails(event);
    shiftDetailsRef.current.open();
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <Row className="g-4">
        <Col lg={4} md={5} className="d-flex flex-column align-items-start">
          <div className="sticky-top" style={{ top: "20px", width: "100%" }}>
            <div className="mb-4">
              <h2
                style={{
                  color: "var(--color-primary-blue-light)",
                  fontWeight: "700",
                  marginBottom: "5px",
                  textAlign: "center"
                }}
              >
                Admin Dashboard
              </h2>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: "1.4",
                  textAlign: "center",
                  display: "block",
                }}
              >
                Welcome back, {user.displayName || "User" }.{" "}
                <br />
                
                {isAdmin
                  ? "Manage, track, and schedule upcoming student jobs from this panel."
                  : <strong> "You are currently in view-only mode. Only administrators can modify jobs."</strong>}
              </p>
            </div>

            <Button
              variant={isJobFormOpen ? "outline-secondary" : "primary"}
              disabled = {!isAdmin}
              className="w-100 py-2 mb-3 shadow-sm"
              onClick={() => {
                if (isJobFormOpen) {
                  jobFormRef.current.closeForm();
                } else {
                  setEditingEvent(null);
                  jobFormRef.current.resetForm();
                  jobFormRef.current.openForm();
                }
              }}
            >
              {isJobFormOpen ? "✕ Cancel" : "+ Create New Job"}
            </Button>

            <div className="p-3 rounded shadow-sm" style={{ backgroundColor: "var(--color-bg-darker)", border: "1px solid #334155" }}>
              <small style={{ color: "var(--color-text-secondary)" }}>
                {currentTab} Jobs: <strong>{events.length}</strong>
              </small>
              <FilterPanel
                events={events}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={resetFilters}
              />
            </div>
          </div>
        </Col>

        <Col lg={8} md={7} style={{ borderLeft: "1px solid #334155" }}>
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <ButtonGroup>
              {tabNames.map((tab) => (
                <Button
                  key={tab}
                  variant={currentTab === tab ? "primary" : "outline-primary"}
                  onClick={() => setCurrentTab(tab)}
                  style={{ fontWeight: currentTab === tab ? "600" : "400" }}
                >
                  {tab} Jobs
                </Button>
              ))}
            </ButtonGroup>
          </div>

          {loading ? (
            <p className="text-center text-muted">Loading {currentTab.toLowerCase()} jobs...</p>
          ) : (
            <div className="event-scroll-container">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-5 rounded" style={{ backgroundColor: "var(--color-bg-darker)", border: "1px solid #334155" }}>
                  <p style={{ color: "var(--color-text-secondary)" }}>
                    No {currentTab.toLowerCase()} jobs match your filters.
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    status={currentTab}
                    onConfirm={(event) => confirmJobRef.current.open(event)}
                    onEdit={() => jobFormRef.current.handleEditEvent(event)}
                    onManage={handleOpenManage}
                    onRefresh={fetchEvents}
                    onCallBack={deleteEvent}
                    onViewCompletedDetails={handleViewCompletedDetails}
                    user={user}
                    isAdmin={isAdmin}
                  />
                ))
              )}
            </div>
          )}
        </Col>
      </Row>

      <JobForms
        ref={jobFormRef}
        onOpenChange={setisJobFormOpen}
        user={user}
        fetchEvents={fetchEvents}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
      />
      <ShiftDetails ref={shiftDetailsRef} completedEventDetails={completedEventDetails} />
      <ConfirmJobModal
        ref={confirmJobRef}
        onConfirmed={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
      />
      <JobManagementModal
        show={showManageModal}
        onHide={() => setShowManageModal(false)}
        event={selectedEvent}
        onRefresh={fetchEvents}
      />
    </div>
  );
}

export default Dashboard;
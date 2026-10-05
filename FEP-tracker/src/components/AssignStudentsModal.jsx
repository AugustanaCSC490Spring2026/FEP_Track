import React, { useState, useEffect } from "react";
import { Modal, Button, ListGroup, Spinner, Form, Badge } from "react-bootstrap";
import { database } from "../firebase-config";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function AssignStudentsModal({ show, onHide, event, onRefresh }) {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState("");
    const [fetching, setFetching] = useState(false);
    const [assigningId, setAssigningId] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchStudents = async () => {
            setFetching(true);
            setError("");
            try {
                const q = query(collection(database, "users"), where("role", "==", "student"));
                const snap = await getDocs(q);
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setStudents(list);
            } catch (err) {
                console.error("Failed to load students:", err);
                setError("Could not load students.");
            } finally {
                setFetching(false);
            }
        };

        if (show) {
            setSearch("");
            fetchStudents();
        }
    }, [show]);

    const assigned = event?.students || [];
    const pending = event?.pending_students || [];
    const isFull = event?.student_cap ? assigned.length >= event.student_cap : false;

    const term = search.trim().toLowerCase();
    const filteredStudents = students.filter((s) =>
        !term ||
        s.name?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term)
    );

    // Assign directly — skips the approval step, and clears any pending request
    const handleAssign = async (studentId) => {
        setAssigningId(studentId);
        setError("");
        try {
            await updateDoc(doc(database, "upcoming_events", event.id), {
                students: arrayUnion(studentId),
                pending_students: arrayRemove(studentId)
            });

            if (onRefresh) {
                await onRefresh();
            }
        } catch (err) {
            console.error("Assign failed:", err);
            setError("Failed to assign student.");
        } finally {
            setAssigningId(null);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Assign Students: {event?.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Control
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mb-2"
                    autoFocus
                />
                <div className="d-flex justify-content-between mb-3">
                    <small className="text-muted">
                        Assigned: {assigned.length}{event?.student_cap ? ` / ${event.student_cap}` : ""}
                    </small>
                    {isFull && <small className="text-danger fw-bold">Job is full</small>}
                </div>

                {error && <p className="text-danger small">{error}</p>}

                {fetching ? (
                    <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
                ) : (
                    <ListGroup style={{ maxHeight: "350px", overflowY: "auto" }}>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((s) => {
                                const isAssigned = assigned.includes(s.id);
                                const isPending = pending.includes(s.id);
                                return (
                                    <ListGroup.Item key={s.id} className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div>
                                                {s.name || "Unnamed Student"}
                                                {isPending && <Badge bg="warning" text="dark" className="ms-2">Pending</Badge>}
                                            </div>
                                            <small className="text-muted">{s.email}</small>
                                        </div>
                                        {isAssigned ? (
                                            <Badge bg="success">Assigned</Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() => handleAssign(s.id)}
                                                disabled={assigningId !== null || isFull}
                                            >
                                                {assigningId === s.id ? <Spinner animation="border" size="sm" /> : "Assign"}
                                            </Button>
                                        )}
                                    </ListGroup.Item>
                                );
                            })
                        ) : (
                            <p className="text-muted small ps-2">No students match your search.</p>
                        )}
                    </ListGroup>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Done</Button>
            </Modal.Footer>
        </Modal>
    );
}

import React, { useState, useEffect } from "react";
import { Modal, Button, ListGroup, Spinner } from "react-bootstrap";
import { database } from "../firebase-config";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function JobManagementModal({ show, onHide, event, onRefresh }) {
    const [studentNames, setStudentNames] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchNames = async () => {
            if (!event) return;
            const allUids = [...(event.pending_students || []), ...(event.students || [])];
            const names = { ...studentNames };

            for (const uid of allUids) {
                if (!names[uid]) {
                    const userDoc = await getDoc(doc(database, "users", uid));
                    names[uid] = userDoc.exists() ? userDoc.data().name : "Unknown Student";
                }
            }
            setStudentNames(names);
        };

        if (show) fetchNames();
    }, [show, event]);

    const handleAction = async (studentId, action) => {
        console.log("Handling Action")
        setLoading(true);
        const eventRef = doc(database, "upcoming_events", event.id);

        try {
            if (action === "approve") {
                await updateDoc(eventRef, {
                    students: arrayUnion(studentId),
                    pending_students: arrayRemove(studentId)
                });
            } else if (action === "reject") {
                await updateDoc(eventRef, { pending_students: arrayRemove(studentId) });
            } else if (action === "remove") {
                await updateDoc(eventRef, { students: arrayRemove(studentId) });
            }

            if (onRefresh) {
                await onRefresh();
            }
        } catch (error) {
            console.error("Update failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Manage Roster: {event?.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* SECTION: PENDING STUDENTS */}
                <h6 className="fw-bold text-primary">Pending Approval</h6>
                <ListGroup className="mb-4">
                    {event?.pending_students?.length > 0 ? (
                        event.pending_students.map((sid) => (
                            <ListGroup.Item key={sid} className="d-flex justify-content-between align-items-center">
                                <span>{studentNames[sid] || "Loading..."}</span>
                                <div>
                                    <Button size="sm" variant="success" className="me-2" onClick={() => handleAction(sid, "approve")} disabled={loading}>Approve</Button>
                                    <Button size="sm" variant="outline-danger" onClick={() => handleAction(sid, "reject")} disabled={loading}>Reject</Button>
                                </div>
                            </ListGroup.Item>
                        ))
                    ) : (
                        <p className="text-muted small ps-2">No students currently waiting for approval.</p>
                    )}
                </ListGroup>

                {/* SECTION: APPROVED STUDENTS */}
                <h6 className="fw-bold text-success">Approved Students</h6>
                <ListGroup>
                    {event?.students?.length > 0 ? (
                        event.students.map((sid) => (
                            <ListGroup.Item key={sid} className="d-flex justify-content-between align-items-center">
                                <span>{studentNames[sid] || "Loading..."}</span>
                                <Button size="sm" variant="link" className="text-danger p-0" onClick={() => handleAction(sid, "remove")} disabled={loading}>Remove</Button>
                            </ListGroup.Item>
                        ))
                    ) : (
                        <p className="text-muted small ps-2">No students approved yet.</p>
                    )}
                </ListGroup>
            </Modal.Body>
        </Modal>
    );
}
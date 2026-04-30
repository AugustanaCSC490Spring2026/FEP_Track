import { useEffect, useState, useRef } from "react";
import { database } from "../firebase-config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import Papa from "papaparse";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { Trash, PencilSquare } from "react-bootstrap-icons";

function Students({ user }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("pending");
  const [phone, setPhone] = useState("");
  const [ID, setID] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [search, setSearch] = useState("");
  const [sortByRole, setSortByRole] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    student: null,
    newRole: null,
  });

  const [editModal, setEditModal] = useState({ show: false, student: null });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", ID: "" });

  const openEditModal = (student) => {
    setEditForm({
      name: student.name || "",
      email: student.email || "",
      phone: student.phone || "",
      ID: student.ID || "",
    });
    setEditModal({ show: true, student });
  };

  const closeEditModal = () => setEditModal({ show: false, student: null });

  const handleEditSave = async () => {
    const { student } = editModal;
    if (!editForm.email) return;
    try {
      await updateDoc(doc(database, "users", student.id), {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        ID: editForm.ID,
      });
      setStudents(prev =>
        prev.map(s => s.id === student.id ? { ...s, ...editForm } : s)
      );
      closeEditModal();
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const fileInputRef = useRef(null);

  const rolePill = (role) => {
    const styles = {
      admin:     { background: "#fee2e2", color: "#991b1b" },
      staff:     { background: "#dbeafe", color: "#1e40af" },
      student:   { background: "#dcfce7", color: "#166534" },
      pending:   { background: "#fef9c3", color: "#854d0e" },
      suspended: { background: "#f3e8ff", color: "#6b21a8" },
    };
    const s = styles[role] || styles.pending;
    const label = role.charAt(0).toUpperCase() + role.slice(1);
    return (
      <span style={{
        background: s.background,
        color: s.color,
        padding: "3px 12px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        display: "inline-block"
      }}>
        {label}
      </span>
    );
  };

  const getRoleStyle = (role) => {
    if (role === "admin")     return { background: "#fee2e2", color: "#991b1b" };
    if (role === "staff")     return { background: "#dbeafe", color: "#1e40af" };
    if (role === "student")   return { background: "#dcfce7", color: "#166534" };
    if (role === "suspended") return { background: "#f3e8ff", color: "#6b21a8" };
    return { background: "#fef9c3", color: "#854d0e" };
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!email) return;
    const newUser = { createdAt: serverTimestamp(), name: name || "N/A", email, role, ID, phone };
    try {
      const docRef = await addDoc(collection(database, "users"), newUser);
      setStudents(prev => [...prev, { id: docRef.id, ...newUser }]);
      setName(""); setID(""); setEmail(""); setPhone(""); setRole("pending"); setShowForm(false);
    } catch (err) { console.error("Error adding user:", err); }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newStudents = [];
        for (const row of results.data) {
          if (!row.email) continue;
          const newStudent = {
            createdAt: serverTimestamp(),
            name: row.name || "N/A",
            email: row.email,
            role: "student",
            phone: row.phone || "",
            ID: row.ID || ""
          };
          try {
            const docRef = await addDoc(collection(database, "users"), newStudent);
            newStudents.push({ id: docRef.id, ...newStudent });
          } catch (err) { console.error("Error adding student:", err); }
        }
        setStudents(prev => [...prev, ...newStudents]);
        setToastMessage(`${newStudents.length} students added successfully!`);
        setShowToast(true);
      }
    });
  };

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const snap = await getDocs(collection(database, "users"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(data);
        const initialNotes = {};
        data.forEach(s => { initialNotes[s.id] = s.note || ""; });
        setNotes(initialNotes);
      } catch (err) { console.error("Error loading students:", err); }
      finally { setLoading(false); }
    };
    loadStudents();
  }, []);

  const handleRoleChange = async (student, newRole) => {
    if (newRole === "staff" || newRole === "admin") {
      setConfirmModal({ show: true, student, newRole });
      return;
    }
    await applyRoleChange(student, newRole);
  };

  const applyRoleChange = async (student, newRole) => {
    await updateDoc(doc(database, "users", student.id), { role: newRole });
    setStudents(prev =>
      prev.map(s => s.id === student.id ? { ...s, role: newRole } : s)
    );
  };

  const handleConfirmRole = async () => {
    const { student, newRole } = confirmModal;
    setConfirmModal({ show: false, student: null, newRole: null });
    await applyRoleChange(student, newRole);
  };

  const handleCancelRole = () => {
    setConfirmModal({ show: false, student: null, newRole: null });
  };

  const handleNoteChange = (studentId, value) => {
    setNotes(prev => ({ ...prev, [studentId]: value }));
  };

  const handleNoteSave = async (student) => {
    const note = notes[student.id] || "";
    await updateDoc(doc(database, "users", student.id), { note });
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) return;
    try {
      await deleteDoc(doc(database, "users", student.id));
      setStudents(prev => prev.filter(s => s.id !== student.id));
    } catch (err) { console.error("Error deleting user:", err); }
  };

  const roleOrder = { admin: 0, staff: 1, student: 2, pending: 3, suspended: 4 };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = sortByRole
    ? [...filtered].sort((a, b) => (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5))
    : filtered;

  if (loading) return <p className="text-center mt-4">Loading students...</p>;

  return (
    <div style={{ padding: "20px" }}>

      {/* Role Promotion Confirmation Modal */}
      <Modal show={confirmModal.show} onHide={handleCancelRole} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Role Change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to change{" "}
          <strong>{confirmModal.student?.name}</strong> to{" "}
          <strong style={{ textTransform: "capitalize" }}>{confirmModal.newRole}</strong>?
          {confirmModal.newRole === "admin" && (
            <p className="mt-2 mb-0 text-danger" style={{ fontSize: 13 }}>
              ⚠️ Admins have full access to manage all users and settings.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelRole}>Cancel</Button>
          <Button
            variant={confirmModal.newRole === "admin" ? "danger" : "primary"}
            onClick={handleConfirmRole}
          >
            Yes, change to {confirmModal.newRole}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit User Modal */}
      <Modal show={editModal.show} onHide={closeEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>ID</Form.Label>
              <Form.Control
                type="text"
                value={editForm.ID}
                onChange={(e) => setEditForm(prev => ({ ...prev, ID: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                placeholder="(xxx)-xxx-xxxx"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
          <Button variant="primary" onClick={handleEditSave}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* Buttons */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="primary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
          Import Many Students (CSV)
        </Button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleCSVUpload}
        />
        <Button variant="primary" onClick={() => setShowForm(true)}>
          Create New User
        </Button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="mb-4">
          <Form onSubmit={handleAddStudent}>
            <div className="d-flex gap-2 flex-wrap">
              <Form.Control
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Form.Control
                type="text"
                placeholder="ID"
                value={ID}
                onChange={(e) => setID(e.target.value)}
                required
              />
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Form.Control
                type="text"
                placeholder="Phone (xxx)-xxx-xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Form.Select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="pending">Pending (Student)</option>
                <option value="student">Approved Student</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="suspended">Suspended</option>
              </Form.Select>
              <Button type="submit" variant="success">Create</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            outline: "none",
            color: "#374151",
            background: "white",
          }}
        />
      </div>

      {/* Scrollable Table */}
      <div style={{
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        maxHeight: "60vh",
        overflowY: "auto",
      }}>
        <Table className="mb-0" style={{ fontSize: 14, minWidth: 700 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              {["Name", "ID", "Email / Phone", "Role", "Notes", ""].map(h => (
                <th
                  key={h}
                  onClick={h === "Role" ? () => setSortByRole(prev => !prev) : undefined}
                  style={{
                    padding: "14px 16px",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                    backgroundColor: "#0d6efd",
                    borderBottom: "none",
                    cursor: h === "Role" ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {h === "Role" ? `Role ${sortByRole ? "↑" : "↓"}` : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((student, i) => (
              <tr
                key={student.id}
                style={{ background: i % 2 === 0 ? "white" : "#f8fafc", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#f8fafc"}
              >
                <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 500, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "#dbeafe", color: "#1e40af",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, flexShrink: 0
                    }}>
                      {(student.name || "?")[0].toUpperCase()}
                    </div>
                    {student.name || "N/A"}
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 500, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                  {student.ID || "N/A"}
                </td>
                <td style={{ padding: "12px 16px", color: "#64748b", verticalAlign: "middle" }}>
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                    <span>{student.email || "N/A"}</span>
                    <span style={{ fontSize: 12, color: "#475569" }}>
                      Phone: {student.phone || "N/A"}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                  {user?.role === "admin" && student.id !== user?.uid ? (
                    <Form.Select
                      size="sm"
                      value={student.role}
                      onChange={(e) => handleRoleChange(student, e.target.value)}
                      style={{
                        minWidth: "110px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        border: "none",
                        appearance: "auto",
                        ...getRoleStyle(student.role)
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="student">Student</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="suspended">Suspended</option>
                    </Form.Select>
                  ) : rolePill(student.role)}
                </td>
                <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                  {student.role !== "staff" && student.role !== "admin" && (
                    <textarea
                      placeholder="Add a note..."
                      value={notes[student.id] || ""}
                      onChange={(e) => handleNoteChange(student.id, e.target.value)}
                      onBlur={() => handleNoteSave(student)}
                      rows={2}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        outline: "none",
                        width: "100%",
                        minWidth: 180,
                        color: "#374151",
                        background: "white",
                        resize: "vertical",
                        lineHeight: 1.4,
                      }}
                    />
                  )}
                </td>
                <td style={{ padding: "12px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <PencilSquare
                      size={16}
                      style={{ color: "#0d6efd", cursor: "pointer" }}
                      onClick={() => openEditModal(student)}
                      title="Edit user"
                    />
                    {student.id !== user?.uid && (
                      <Trash
                        size={16}
                        style={{ color: "#dc2626", cursor: "pointer" }}
                        onClick={() => handleDelete(student)}
                        title="Delete user"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 10 }}>
        Showing {filtered.length} of {students.length} users
      </p>

      {/* Toast */}
      {showToast && (
        <div style={{ position: "fixed", top: 65, left: 15 }}>
          <div
            className="toast show"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            style={{ minWidth: 100, maxWidth: 215 }}
          >
            <div className="toast-header">
              <strong className="me-auto">Upload Status</strong>
              <button type="button" className="btn-close" onClick={() => setShowToast(false)} />
            </div>
            <div className="toast-body" style={{ color: "black" }}>{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;
import React, { useState, useEffect, useMemo, useRef } from "react";
import { database } from "../firebase-config";
import { collection, getDocs } from "firebase/firestore";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([ AllCommunityModule ]);

function Reports({ user }) {
    const [loading, setLoading] = useState(true);
    const [allEvents, setAllEvents] = useState([]);
    const [userMap, setUserMap] = useState({});

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const studentGridRef = useRef();
    const deptGridRef = useRef();
    const rawGridRef = useRef();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const eventsSnap = await getDocs(collection(database, "completed_events"));
                const eventsData = eventsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setAllEvents(eventsData);

                const usersSnap = await getDocs(collection(database, "users"));
                const usersData = {};
                usersSnap.docs.forEach(doc => {
                    usersData[doc.id] = {
                        name: doc.data().name || "Unknown Student",
                        realId: doc.data().ID || doc.id
                    };
                });
                setUserMap(usersData);

            } catch (error) {
                console.error("Error fetching reports data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatTime = (totalMins) => {
        const hours = Math.floor(totalMins / 60);
        const minutes = totalMins % 60;
        return `${hours}h ${minutes}m`;
    };

    const processedData = useMemo(() => {
        let filteredEvents = allEvents;

        if (startDate) {
            filteredEvents = filteredEvents.filter(e => e.date >= startDate);
        }
        if (endDate) {
            filteredEvents = filteredEvents.filter(e => e.date <= endDate);
        }

        const studentStatsObj = {};
        const deptStatsObj = {};
        const rawLogsArr = [];

        filteredEvents.forEach((event) => {
            const dept = event.department || "Unassigned";

            if (!deptStatsObj[dept]) {
                deptStatsObj[dept] = { department: dept, totalShifts: 0, totalMinutes: 0 };
            }
            deptStatsObj[dept].totalShifts += 1;

            const attendance = event.attendance || {};
            Object.values(attendance).forEach((record) => {
                const docId = record.id;

                const userInfo = userMap[docId] || { name: docId, realId: docId };
                const studentName = userInfo.name;
                const displayId = userInfo.realId;

                const minutesWorked = (record.hours || 0) * 60 + (record.minutes || 0);

                deptStatsObj[dept].totalMinutes += minutesWorked;

                if (!studentStatsObj[docId]) {
                    studentStatsObj[docId] = {
                        studentId: displayId,
                        studentName: studentName,
                        totalJobs: 0,
                        totalMinutes: 0
                    };
                }
                studentStatsObj[docId].totalJobs += 1;
                studentStatsObj[docId].totalMinutes += minutesWorked;

                if (minutesWorked > 0) {
                    rawLogsArr.push({
                        date: event.date,
                        title: event.title,
                        department: dept,
                        studentName: studentName,
                        supervisor: event.supervisor,
                        location: event.location,
                        formattedTime: formatTime(minutesWorked),
                        rawMinutes: minutesWorked,
                    });
                }
            });
        });

        return {
            studentStats: Object.values(studentStatsObj).map(s => ({ ...s, formattedTime: formatTime(s.totalMinutes) })),
            deptStats: Object.values(deptStatsObj).map(d => ({ ...d, formattedTime: formatTime(d.totalMinutes) })),
            rawLogs: rawLogsArr
        };
    }, [allEvents, userMap, startDate, endDate]);

    const defaultColDef = { sortable: true, filter: true, floatingFilter: true, flex: 1 };

    const deptColDefs = [
        { field: "department", headerName: "Department" },
        { field: "totalShifts", headerName: "Total Shifts", filter: "agNumberColumnFilter" },
        { headerName: "Total Time",
            field: "totalMinutes",
            filter: "agNumberColumnFilter",
            sortable: true,
            filterParams: { filterPlaceholder: "Enter in minutes..." },
            valueFormatter: (params) => {
                if (!params.value) return "0h 0m";
                const hours = Math.floor(params.value / 60);
                const minutes = params.value % 60;
                return `${hours}h ${minutes}m`;
            }
        }
    ];

    const studentColDefs = [
        { field: "studentName", headerName: "Student Name" },
        { field: "studentId", headerName: "Student ID" },
        { field: "totalJobs", headerName: "Jobs Worked", filter: "agNumberColumnFilter" },
        { headerName: "Total Time",
            field: "totalMinutes",
            filter: "agNumberColumnFilter",
            sortable: true,
            filterParams: { filterPlaceholder: "Enter in minutes..." },
            valueFormatter: (params) => {
                if (!params.value) return "0h 0m";
                const hours = Math.floor(params.value / 60);
                const minutes = params.value % 60;
                return `${hours}h ${minutes}m`;
            }
        }
    ];

    const rawColDefs = [
        { field: "date", headerName: "Date", filter: "agDateColumnFilter" },
        { field: "studentName", headerName: "Student" },
        { field: "department", headerName: "Department" },
        { field: "title", headerName: "Job Title" },
        { headerName: "Shift Duration",
            field: "rawMinutes",
            filter: "agNumberColumnFilter",
            sortable: true,
            filterParams: { filterPlaceholder: "Enter in minutes..." },
            valueFormatter: (params) => {
                if (!params.value) return "0h 0m";
                const hours = Math.floor(params.value / 60);
                const minutes = params.value % 60;
                return `${hours}h ${minutes}m`;
            }
        }
    ];

    const onExportClick = (gridRef, fileName) => {
        if (gridRef.current) {
            gridRef.current.api.exportDataAsCsv({ fileName: `${fileName}.csv` });
        }
    };

    return (
        <div style={{ maxWidth: "1400px", margin: "auto", padding: "40px 20px" }}>

            {/* HEADER & GLOBAL FILTERS */}
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <h2 style={{ color: "var(--color-primary-blue-light)", fontWeight: "700", margin: 0 }}>Reports Engine</h2>
                    <p style={{ color: "var(--color-text-secondary)", marginBottom: 0 }}>Dynamic filtering and exporting for employment data.</p>
                </div>

                <Card className="p-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-bg-darker)" }}>
                    <div className="d-flex gap-3 align-items-center">
                        <Form.Group>
                            <Form.Label className="small mb-1" style={{ color: "var(--color-text-secondary)" }}>Start Date</Form.Label>
                            <Form.Control type="date" size="sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label className="small mb-1" style={{ color: "var(--color-text-secondary)" }}>End Date</Form.Label>
                            <Form.Control type="date" size="sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </Form.Group>
                        <button className="btn btn-outline-danger mt-4" onClick={() => { setStartDate(""); setEndDate(""); }} style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }}>
                            Clear
                        </button>
                    </div>
                </Card>
            </div>

            {loading ? (
                <div className="text-center mt-5"><p style={{ color: "var(--color-text-secondary)" }}>Loading historical data...</p></div>
            ) : (
                <Tabs defaultActiveKey="departments" id="report-tabs" className="custom-tabs mb-4">

                    {/* DEPARTMENT TAB */}
                    <Tab eventKey="departments" title="Per Department">
                        <Card className="shadow-sm mt-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-bg-darker)", borderRadius: "8px" }}>
                            <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: "transparent", borderBottom: "1px solid var(--color-bg-darker)" }}>
                                <h5 className="mb-0" style={{ color: "var(--color-text-primary)" }}>Department Reports</h5>
                                <button className="btn btn-outline-success" onClick={() => onExportClick(deptGridRef, "Department_Report")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }}>
                                    Download CSV
                                </button>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="ag-theme-quartz" style={{ height: "600px", width: "100%" }}>
                                    <AgGridReact
                                        ref={deptGridRef}
                                        theme="legacy"
                                        rowData={processedData.deptStats}
                                        columnDefs={deptColDefs}
                                        defaultColDef={defaultColDef}
                                        pagination={true}
                                        paginationPageSize={20}
                                    />
                                </div>
                            </Card.Body>
                        </Card>
                    </Tab>

                    {/* STUDENTS TAB */}
                    <Tab eventKey="students" title="Total Students">
                        <Card className="shadow-sm mt-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-bg-darker)", borderRadius: "8px" }}>
                            <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: "transparent", borderBottom: "1px solid var(--color-bg-darker)" }}>
                                <h5 className="mb-0" style={{ color: "var(--color-text-primary)" }}>Student Reports</h5>
                                <button className="btn btn-outline-success" onClick={() => onExportClick(studentGridRef, "Student_Report")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }}>
                                    Download CSV
                                </button>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="ag-theme-quartz" style={{ height: "600px", width: "100%" }}>
                                    <AgGridReact
                                        ref={studentGridRef}
                                        theme="legacy"
                                        rowData={processedData.studentStats}
                                        columnDefs={studentColDefs}
                                        defaultColDef={defaultColDef}
                                        pagination={true}
                                        paginationPageSize={20}
                                    />
                                </div>
                            </Card.Body>
                        </Card>
                    </Tab>

                    {/* RAW LOGS TAB */}
                    <Tab eventKey="raw" title="Raw Work Logs">
                        <Card className="shadow-sm mt-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-bg-darker)", borderRadius: "8px" }}>
                            <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: "transparent", borderBottom: "1px solid var(--color-bg-darker)" }}>
                                <h5 className="mb-0" style={{ color: "var(--color-text-primary)" }}>All Individual Shifts</h5>
                                <button className="btn btn-outline-success" onClick={() => onExportClick(rawGridRef, "Raw_Work_Logs")} style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }}>
                                    Download CSV
                                </button>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="ag-theme-quartz" style={{ height: "600px", width: "100%" }}>
                                    <AgGridReact
                                        ref={rawGridRef}
                                        theme="legacy"
                                        rowData={processedData.rawLogs}
                                        columnDefs={rawColDefs}
                                        defaultColDef={defaultColDef}
                                        pagination={true}
                                        paginationPageSize={50}
                                    />
                                </div>
                            </Card.Body>
                        </Card>
                    </Tab>

                </Tabs>
            )}
        </div>
    );
}

export default Reports;
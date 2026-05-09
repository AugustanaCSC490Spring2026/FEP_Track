import React from "react";
import { Form, Button } from "react-bootstrap";

function SelectFilter({ label, value, onChange, options, allLabel }) {
  return (
    <Form.Group className="mb-3">
      <Form.Label
        className="small text-uppercase"
        style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}
      >
        {label}
      </Form.Label>
      <Form.Select
        size="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundColor: "var(--color-bg-card)",
          color: "white",
          border: "1px solid #475569",
        }}
      >
        <option value="All">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}

function ButtonFilter({ label, value, onChange, options }) {
  return (
    <Form.Group className="mb-3">
      <Form.Label
        className="small text-uppercase"
        style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}
      >
        {label}
      </Form.Label>
      <div className="d-flex gap-2">
        {options.map((opt) => (
          <Button
            key={opt}
            size="sm"
            variant={value === opt ? "primary" : "outline-secondary"}
            onClick={() => onChange(opt)}
            style={{ fontSize: "0.7rem", flex: 1 }}
          >
            {opt}
          </Button>
        ))}
      </div>
    </Form.Group>
  );
}

export default function FilterPanel({
  events,
  filters,
  onFilterChange,
  onReset,
}) {
  const {
    searchTitle,
    filterDepartment,
    filterSupervisor,
    filterBuilding,
    filterAvailability,
    filterPending,
  } = filters;

  return (
    <Form>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <small style={{ color: "var(--color-text-secondary)" }}>Filters</small>
        <Button
          variant="link"
          size="sm"
          className="p-0 text-decoration-none"
          style={{ color: "var(--color-accent-yellow)", fontSize: "0.75rem" }}
          onClick={onReset}
        >
          Reset
        </Button>
      </div>

      <Form.Group className="mb-3">
        <Form.Label
          className="small text-uppercase"
          style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}
        >
          Search Title
        </Form.Label>
        <Form.Control
          size="sm"
          type="text"
          placeholder="Type to search..."
          value={searchTitle}
          onChange={(e) => onFilterChange("searchTitle", e.target.value)}
          style={{
            backgroundColor: "var(--color-bg-card)",
            color: "white",
            border: "1px solid #475569",
          }}
        />
      </Form.Group>

      <SelectFilter
        label="Department"
        value={filterDepartment}
        onChange={(v) => onFilterChange("filterDepartment", v)}
        options={[...new Set(events.map((e) => e.department).filter(Boolean))]}
        allLabel="All Departments"
      />
      <SelectFilter
        label="Supervisor"
        value={filterSupervisor}
        onChange={(v) => onFilterChange("filterSupervisor", v)}
        options={[...new Set(events.map((e) => e.supervisor).filter(Boolean))]}
        allLabel="All Supervisors"
      />
      <SelectFilter
        label="Location"
        value={filterBuilding}
        onChange={(v) => onFilterChange("filterBuilding", v)}
        options={[...new Set(events.map((e) => e.location).filter(Boolean))]}
        allLabel="All Locations"
      />
      <ButtonFilter
        label="Availability"
        value={filterAvailability}
        onChange={(v) => onFilterChange("filterAvailability", v)}
        options={["All", "Available", "Full"]}
      />
      <ButtonFilter
        label="Pending Applications"
        value={filterPending}
        onChange={(v) => onFilterChange("filterPending", v)}
        options={["All", "Has Pending", "No Pending"]}
      />
    </Form>
  );
}

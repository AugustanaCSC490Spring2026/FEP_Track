import { useState } from "react"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin Dashboard" },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-primary" role="navigation" aria-label="Main navigation">
      <div className="container">
        {/* Logo */}
        <a className="navbar-brand fw-bold" href="/">FEP Tracker</a>

        {/* Hamburger button */}
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-controls="mobile-menu"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close main menu" : "Open main menu"}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Links */}
        <div className={`collapse navbar-collapse ${isOpen ? "show" : ""}`} id="mobile-menu">
          <ul className="navbar-nav ms-auto gap-1">
            {navLinks.map((link) => (
              <li className="nav-item" key={link.href}>
                <a
                  href={link.href}
                  className="nav-link"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
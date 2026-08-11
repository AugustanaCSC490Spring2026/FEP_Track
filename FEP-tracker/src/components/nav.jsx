import { useState } from "react";
import {
  BoxArrowInRight,
  Person,
  House,
  Calendar4Week,
  FileEarmarkBarGraph,
  People,
  CurrencyDollar
} from "react-bootstrap-icons";
/* There is no need for a login seperate page it should be built on to the profile page */

const baseNavLinks = [
  { href: "/", label: "Schedule", icon: <Calendar4Week className="me-3" />  },
  { href: "/profile", label: "Dashboard", icon: <House className="me-3" /> },
/*   { href: "/payperiod", label: "Pay Periods", icon: <CurrencyDollar className="me-3" /> }, */
  { href: "/logout", label: "Logout", icon: <BoxArrowInRight className="me-3" /> },
];

const staffLinks = [
  { href: "/users", label: "Users", icon: <People className="me-3" />},
 /*  { href: "/reports", label: "Reports", icon: <FileEarmarkBarGraph className="me-3" />} */
];

export default function Navbar({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  // if the user is staff add the staff link in the middle of the nav links otherwise just show the base links
  

  const navLinks =
  user?.role === "admin"
    ? [...baseNavLinks.slice(0, 2), ...staffLinks, ...baseNavLinks.slice(2)]
    : user?.role === "staff"
    ? baseNavLinks.filter(link => link.href !== "/payperiod")
    : baseNavLinks;
  return (
    <nav
      className="navbar navbar-expand-md navbar-dark bg-primary"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container position-relative">
  {/* Title - centered on desktop */}
  <span className="fw-bold fs-5 fs-lg-3 position-absolute start-50 translate-middle-x text-white d-none d-md-block">
    Flexible Employment Program
  </span>

  {/* Title - visible on mobile, hidden when menu is open */}
  {!isOpen && (
    <span className="fw-bold fs-6 text-white d-md-none mx-auto">
      Flexible Employment Program
    </span>
  )}

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
        <div
          className={`collapse navbar-collapse ${isOpen ? "show" : ""}`}
          id="mobile-menu"
        >
          <ul className="navbar-nav ms-auto gap-1">
            {/* Show  no links if there is no user */}
            {!user ? (
              <></>
            ) : (
              navLinks.map((link) => (
                <li className={`nav-item${link.href === "/reports" ? " d-none d-md-block" : ""}`} key={link.href}>
                  <a
                    href={link.href}
                    className="nav-link"
                    onClick={() => setIsOpen(false)}
                    aria-current={
                      window.location.pathname === link.href
                        ? "page"
                        : undefined
                    }
                    title={link.label}
                  >
                    {isOpen ? link.label : link.icon}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

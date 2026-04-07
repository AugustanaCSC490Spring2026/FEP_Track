import { useState } from "react";
import {
  House,
  BoxArrowInRight,
  Person,
  Mortarboard
} from "react-bootstrap-icons";
/* There is no need for a login seperate page it should be built on to the a profile page */

const navLinks = [
  { href: "/", label: "Home", icon: <House className="me-3" /> },
  {
    href: "/profile",
    label: "Account",
    icon: <Person className="me-3" />,
  },
  {
    href: "/logout",
    label: "Logout",
    icon: <BoxArrowInRight className="me-3" />,
  }
];

export default function Navbar({ user }) {
  const [isOpen, setIsOpen] = useState(false);
   if (user?.role === "admin") {
    navLinks.push(  {
      href : "/students",
      label : "students",
      icon : <Mortarboard className="me-3"/>
  },);
  }
  return (
    <nav
      className="navbar navbar-expand-md navbar-dark bg-primary"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container">
        {/* Logo */}
        <a className="navbar-brand fw-bold" href="/">
          {user ? `Welcome, ${user.displayName.split(" ")[0]}!` : "FEP Tracker"}
        </a>

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
              <>
              </>
            ) : (
              
              navLinks.map((link) => (
                <li className="nav-item" key={link.href}>
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

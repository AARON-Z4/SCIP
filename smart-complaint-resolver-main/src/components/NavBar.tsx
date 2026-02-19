import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Shield, Menu, X, LayoutDashboard,
  LogIn, LogOut, UserCircle, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Submit Complaint", href: "/submit" },
  { label: "Track Complaint", href: "/track" },
];

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
    navigate("/signin");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-primary hover:opacity-90 transition-opacity"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-primary-foreground" size={18} />
            </div>
            <div className="hidden sm:block">
              <div className="text-[13px] font-700 text-foreground leading-tight tracking-tight">
                Smart Complaint
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight tracking-widest uppercase">
                Intelligence System
              </div>
            </div>
            <div className="sm:hidden font-semibold text-sm text-foreground">SCIS</div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors",
                  location.pathname === link.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Admin button — only for admins */}
            {isAdmin && (
              <Link to="/admin" className="hidden md:flex">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <LayoutDashboard size={13} />
                  Admin
                </Button>
              </Link>
            )}

            {/* Auth section */}
            {isAuthenticated ? (
              <div className="hidden md:block relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-secondary transition-colors"
                  id="user-menu-btn"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <UserCircle size={14} className="text-primary" />
                  </div>
                  <span className="text-xs font-medium max-w-[100px] truncate">
                    {user?.full_name?.split(" ")[0]}
                  </span>
                  <ChevronDown size={13} className="text-muted-foreground" />
                </button>

                {userMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-20">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {user?.full_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user?.email}
                        </p>
                        <span
                          className={cn(
                            "inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                            user?.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {user?.role}
                        </span>
                      </div>
                      <Link
                        to="/track"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors w-full"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        My Complaints
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors w-full"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard size={12} />
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        id="navbar-logout-btn"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut size={12} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/signin">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
                    <LogIn size={13} />
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="text-xs h-8">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === link.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Admin Dashboard
              </Link>
            )}

            {isAuthenticated ? (
              <div className="pt-2 border-t border-border mt-2 space-y-1">
                <div className="px-3 py-1">
                  <p className="text-xs font-semibold text-foreground">{user?.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-border mt-2 space-y-1">
                <Link
                  to="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground text-center"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

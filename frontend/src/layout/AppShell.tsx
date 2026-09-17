import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ClassificationBar } from "../components/ClassificationBar";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  function onSignOut() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-sky">
      <ClassificationBar />
      <a href="#main" className="sr-only bg-brass px-3 py-2 text-night">
        Skip to sitrep
      </a>
      <div className="relative z-10 min-h-[calc(100dvh-32px)] lg:grid lg:grid-cols-[220px_1fr]">
        <Sidebar user={user} />
        <div className="min-w-0">
          <Navbar user={user} onSignOut={onSignOut} />
          <main id="main" className="px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

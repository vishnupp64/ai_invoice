import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../state/auth";
import { useTheme } from "../../state/theme";
import Button from "../ui/Button";
import clsx from "clsx";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "block rounded-md px-3 py-2 text-sm font-medium",
    isActive
      ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
  );

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-4 p-4">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <Link to="/" className="block text-lg font-semibold">
              AI Invoice
            </Link>
            <div className="mt-4 space-y-1">
              <NavLink to="/" end className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/upload" className={navLinkClass}>
                Upload
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
            </div>
            <div className="mt-6 space-y-2">
              <Button variant="secondary" onClick={toggle} className="w-full">
                Theme: {theme === "dark" ? "Dark" : "Light"}
              </Button>
              <Button variant="danger" onClick={logout} className="w-full">
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-4 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {user ? (
                <span>
                  Signed in as <span className="font-medium">{user.name}</span>
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Button variant="secondary" onClick={toggle}>
                {theme === "dark" ? "Dark" : "Light"}
              </Button>
              <Button variant="danger" onClick={logout}>
                Logout
              </Button>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}


import { LogOut } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { adminNav } from "./adminConstants.js";

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#161513] text-[#f4f1ea]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-[#11110f] px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#24231f] ring-1 ring-white/10">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
          </div>
          <div>
            <p className="font-serif text-2xl font-semibold">Theo</p>
            <p className="text-xs uppercase tracking-[0.16em] text-[#8f887f]">Admin</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {adminNav.map((item) => (
            <AdminNavLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-[#1d1c1a] p-3">
            <p className="text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-[#aaa49a]">{user?.email}</p>
          </div>
          <button className="icon-btn w-full" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#11110f]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            Theo Admin
          </div>
          <button className="icon-btn" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {adminNav.map((item) => (
            <AdminNavLink key={item.to} item={item} mobile />
          ))}
        </nav>
      </header>

      <main className="lg:pl-72">
        <Outlet />
      </main>
    </div>
  );
}

function AdminNavLink({ item, mobile = false }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        mobile
          ? `inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm ${
              isActive ? "bg-[#f4f1ea] text-[#171614]" : "bg-[#24231f] text-[#c9c3ba]"
            }`
          : `flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
              isActive ? "bg-[#2b2925] text-[#fffaf0]" : "text-[#b9b2a8] hover:bg-white/7 hover:text-[#fffaf0]"
            }`
      }
    >
      <Icon size={mobile ? 16 : 18} />
      {item.label}
    </NavLink>
  );
}

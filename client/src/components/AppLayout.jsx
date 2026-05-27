import { Bot, CreditCard, Image, LogOut, MessageSquare, Moon, Settings, Sparkles, Sun, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const navItems = [
  { to: "/", label: "Chat", icon: MessageSquare },
  { to: "/images", label: "Images", icon: Image },
  { to: "/gallery", label: "Gallery", icon: Users },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem("theo_theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theo_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-ink dark:text-paper">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line/80 bg-paper/95 px-4 py-5 dark:border-white/10 dark:bg-[#171719] lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-paper dark:bg-paper dark:text-ink">
            <Bot size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold">Theo</p>
            <p className="text-xs uppercase tracking-[0.18em] text-ink/50 dark:text-paper/50">{user?.plan} plan</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-ink text-paper dark:bg-paper dark:text-ink"
                    : "text-ink/70 hover:bg-line/60 dark:text-paper/70 dark:hover:bg-white/10"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 space-y-3">
          <div className="rounded-md border border-line bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-ink/50 dark:text-paper/50">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <button className="icon-btn" onClick={() => setDark((value) => !value)} title="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn flex-1" onClick={logout} title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur dark:border-white/10 dark:bg-ink/90 lg:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles size={20} />
          Theo
        </div>
        <button className="icon-btn" onClick={() => setDark((value) => !value)} title="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="lg:pl-64">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-paper dark:border-white/10 dark:bg-[#171719] lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `grid h-16 place-items-center text-xs ${isActive ? "text-clay" : "text-ink/55 dark:text-paper/55"}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

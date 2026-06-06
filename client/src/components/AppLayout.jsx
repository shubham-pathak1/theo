import { CreditCard, Image, LogOut, MessageSquare, Moon, Settings, Sun, Users } from "lucide-react";
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
  const { user, logout, resendVerification } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem("theo_theme") !== "light");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theo_theme", dark ? "dark" : "light");
  }, [dark]);

  async function resendVerificationEmail() {
    setVerificationNotice("");
    setVerificationBusy(true);

    try {
      const data = await resendVerification();
      setVerificationNotice(data.devVerificationUrl || data.message || "Verification link sent.");
    } catch (error) {
      setVerificationNotice(error.message || "Could not send verification link.");
    } finally {
      setVerificationBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1d1c1a] text-[#f4f1ea]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-[#181715] px-4 py-5 text-[#f4f1ea] lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#2a2926] ring-1 ring-white/10">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
          </div>
          <div>
            <p className="font-serif text-2xl font-semibold">Theo</p>
            <p className="text-xs text-[#aaa49a]">{user?.plan} plan</p>
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
                    ? "bg-[#2e2d2a] text-[#fffaf0]"
                    : "text-[#c9c3ba] hover:bg-white/7 hover:text-[#fffaf0]"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-[#22211f] p-3">
            <p className="text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-[#aaa49a]">{user?.email}</p>
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

      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/10 bg-[#181715]/95 px-4 text-[#f4f1ea] backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          Theo
        </div>
        <button className="icon-btn" onClick={() => setDark((value) => !value)} title="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="min-w-0 lg:pl-72">
        {user && !user.emailVerified && (
          <div className="border-b border-[#d9895f]/20 bg-[#2a211c] px-4 py-3 text-sm text-[#f0c2a6] lg:px-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Verify your email to keep account recovery and security notices active.
                {verificationNotice?.startsWith("http") && (
                  <a className="ml-1 break-all font-semibold underline" href={verificationNotice}>
                    Open verification link
                  </a>
                )}
                {verificationNotice && !verificationNotice.startsWith("http") && <span className="ml-1">{verificationNotice}</span>}
              </p>
              <button
                type="button"
                className="h-9 rounded-md bg-[#f4f1ea] px-3 text-xs font-semibold text-[#181715] disabled:opacity-60"
                onClick={resendVerificationEmail}
                disabled={verificationBusy}
              >
                {verificationBusy ? "Sending" : "Resend link"}
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-white/10 bg-[#181715] pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `grid h-16 min-w-0 place-items-center gap-1 text-[11px] ${isActive ? "text-[#f4f1ea]" : "text-[#aaa49a]"}`
            }
          >
            <item.icon size={20} />
            <span className="max-w-full truncate px-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

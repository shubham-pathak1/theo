import { useMemo, useState } from "react";
import { api, setAccessToken } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const [customInstructions, setCustomInstructions] = useState(user?.customInstructions || "");
  const [profile, setProfile] = useState({
    displayName: user?.displayName || "",
    avatarUrl: user?.avatarUrl || ""
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [notice, setNotice] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const generatedAvatarUrl = useMemo(() => {
    const seed = encodeURIComponent(user?.email || user?.displayName || "theo");
    return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=1d1c1a&fontFamily=Arial&fontWeight=700&textColor=f4f1ea`;
  }, [user]);

  const avatarSrc = profile.avatarUrl || generatedAvatarUrl;

  async function saveProfile() {
    const data = await api.patch("/api/users/profile", profile);
    updateUser(data.user);
    setNotice("Profile saved.");
  }

  async function saveSettings() {
    const data = await api.patch("/api/users/settings", { customInstructions });
    updateUser(data.user);
    setNotice("Instructions saved.");
  }

  async function changePassword() {
    try {
      const data = await api.patch("/api/users/password", passwords);
      setNotice(data.message || "Password updated. Signing you out…");
      setPasswords({ currentPassword: "", newPassword: "" });
      setAccessToken("");
      window.setTimeout(() => logout(), 900);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== user?.email) {
      setNotice("Enter your email to confirm account deletion.");
      return;
    }
    await api.delete("/api/users/account");
    setAccessToken("");
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] sm:px-6 lg:pb-10">
      <div className="space-y-10">

        <header>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
          <p className="mt-2 text-[#aaa49a]">Account, profile, and chat behavior.</p>
        </header>

        {notice && (
          <p className="rounded-xl border border-white/10 bg-[#252421] px-4 py-3 text-sm text-[#c9c3ba]">
            {notice}
          </p>
        )}

        {/* Profile */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Profile</h2>
          <div className="rounded-2xl border border-white/10 bg-[#22211f] p-5">
            <div className="flex items-center gap-5 mb-6">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#2a2926]">
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-[#e8dfd2]">{user?.displayName}</p>
                <p className="text-sm text-[#8f887f]">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="field">
                <span>Display name</span>
                <input
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Avatar URL</span>
                <input
                  value={profile.avatarUrl}
                  onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              <button className="primary-btn" onClick={saveProfile}>
                Save profile
              </button>
            </div>
          </div>
        </section>

        {/* Custom instructions */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Custom instructions</h2>
          <div className="rounded-2xl border border-white/10 bg-[#22211f] p-5 space-y-4">
            <p className="text-sm text-[#8f887f]">Tell Theo how to respond across all chats.</p>
            <textarea
              className="min-h-36 w-full rounded-xl border border-white/10 bg-[#1d1c1a] px-4 py-3 leading-7 text-[#f4f1ea] outline-none placeholder:text-[#6b6560] focus:border-white/35"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Always respond concisely. Prefer code over prose."
            />
            <button className="primary-btn" onClick={saveSettings}>
              Save instructions
            </button>
          </div>
        </section>

        {/* Password */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Password</h2>
          <div className="rounded-2xl border border-white/10 bg-[#22211f] p-5 space-y-4">
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </label>
            <button
              className="primary-btn"
              onClick={changePassword}
              disabled={!passwords.currentPassword || passwords.newPassword.length < 8}
            >
              Change password
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Danger zone</h2>
          <div className="rounded-2xl border border-[#d9895f]/20 bg-[#22211f] p-5 space-y-4">
            <p className="text-sm text-[#aaa49a]">
              Permanently deletes your conversations, images, and account. Type your email to confirm.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="min-h-11 flex-1 rounded-xl border border-white/10 bg-[#1d1c1a] px-3 text-[#f4f1ea] outline-none placeholder:text-[#6b6560] focus:border-white/35"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={user?.email}
              />
              <button
                className="icon-btn border-[#d9895f]/30 text-[#efb18d] shrink-0"
                onClick={deleteAccount}
              >
                Delete account
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

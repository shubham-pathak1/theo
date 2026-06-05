import { KeyRound, Link2, Save, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { api, setAccessToken } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const [customInstructions, setCustomInstructions] = useState(user?.customInstructions || "");
  const [profile, setProfile] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    avatarUrl: user?.avatarUrl || ""
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [notice, setNotice] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const generatedAvatarUrl = useMemo(() => {
    const seed = encodeURIComponent(user?.email || user?.displayName || "theo");
    return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=1d1c1a&fontFamily=Arial&fontWeight=700&textColor=f4f1ea`;
  }, [user]);

  async function saveProfile() {
    const data = await api.patch("/api/users/profile", profile);
    updateUser(data.user);
    setNotice("Profile saved.");
  }

  async function useGeneratedAvatar() {
    const next = { ...profile, avatarUrl: generatedAvatarUrl };
    setProfile(next);
    const data = await api.patch("/api/users/profile", next);
    updateUser(data.user);
    setNotice("Avatar updated.");
  }

  async function saveSettings() {
    const data = await api.patch("/api/users/settings", { customInstructions });
    updateUser(data.user);
    setNotice("Instructions saved.");
  }

  async function changePassword() {
    try {
      const data = await api.patch("/api/users/password", passwords);
      setNotice(data.message || "Password updated.");
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
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-[#aaa49a]">Account, profile, and persistent chat behavior.</p>
        </header>

        {notice && <p className="mb-4 border border-white/10 bg-[#252421] px-3 py-2 text-sm text-[#c9c3ba]">{notice}</p>}

        <section className="grid gap-5">
          <Panel title="Profile">
            <div className="grid gap-5 lg:grid-cols-[10rem_1fr]">
              <div>
                <div className="aspect-square overflow-hidden border border-white/10 bg-[#181715]">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <img src={generatedAvatarUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <button className="icon-btn mt-3 w-full" onClick={useGeneratedAvatar}>
                  <Wand2 size={16} />
                  Generate
                </button>
              </div>
              <div className="grid gap-4">
                <label className="field">
                  <span>Display name</span>
                  <input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
                </label>
                <label className="field">
                  <span>Bio</span>
                  <textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
                </label>
                <label className="field">
                  <span>Avatar URL</span>
                  <input value={profile.avatarUrl} onChange={(event) => setProfile({ ...profile, avatarUrl: event.target.value })} />
                </label>
                <button className="primary-btn justify-self-start" onClick={saveProfile}>
                  <Save size={18} />
                  Save profile
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Custom instructions">
            <textarea
              className="min-h-44 w-full border border-white/10 bg-[#1d1c1a] px-4 py-3 leading-7 text-[#f4f1ea] outline-none placeholder:text-[#8f887f] focus:border-white/35"
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value)}
              placeholder="Tell Theo how to respond across chats"
            />
            <button className="primary-btn mt-4" onClick={saveSettings}>
              <Save size={18} />
              Save instructions
            </button>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Connected accounts">
              <div className="flex items-center justify-between border border-white/10 bg-[#1d1c1a] p-4">
                <div className="flex items-center gap-3">
                  <Link2 size={18} className="text-[#d9895f]" />
                  <div>
                    <p className="font-semibold">Google</p>
                    <p className="text-sm text-[#8f887f]">{user?.avatarUrl || user?.emailVerified ? "Connected or verified" : "Not connected"}</p>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Account</span>
              </div>
            </Panel>

            <Panel title="Password">
              <div className="grid gap-3">
                <label className="field">
                  <span>Current password</span>
                  <input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
                </label>
                <label className="field">
                  <span>New password</span>
                  <input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
                </label>
                <button className="icon-btn justify-self-start" onClick={changePassword} disabled={!passwords.currentPassword || passwords.newPassword.length < 8}>
                  <KeyRound size={17} />
                  Change password
                </button>
              </div>
            </Panel>
          </div>

          <Panel title="Delete account">
            <p className="mb-4 text-sm leading-6 text-[#aaa49a]">This removes conversations, images, and account access. Enter your email to confirm.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="min-h-11 flex-1 border border-white/10 bg-[#1d1c1a] px-3 text-[#f4f1ea] outline-none placeholder:text-[#8f887f] focus:border-white/35"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder={user?.email}
              />
              <button className="icon-btn border-[#d9895f]/30 text-[#efb18d]" onClick={deleteAccount}>
                <Trash2 size={17} />
                Delete account
              </button>
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="border border-white/10 bg-[#22211f] p-5">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

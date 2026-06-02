import { Save } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [customInstructions, setCustomInstructions] = useState(user?.customInstructions || "");
  const [profile, setProfile] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    avatarUrl: user?.avatarUrl || ""
  });
  const [notice, setNotice] = useState("");

  async function saveProfile() {
    const data = await api.patch("/api/users/profile", profile);
    updateUser(data.user);
    setNotice("Profile saved");
  }

  async function saveSettings() {
    const data = await api.patch("/api/users/settings", { customInstructions });
    updateUser(data.user);
    setNotice("Instructions saved");
  }

  return (
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-[#aaa49a]">Profile and persistent chat behavior.</p>
        </header>

        {notice && <p className="mb-4 rounded-xl border border-white/10 bg-[#252421] px-3 py-2 text-sm text-[#c9c3ba]">{notice}</p>}

        <section className="grid gap-5">
          <div className="rounded-2xl border border-white/10 bg-[#252421] p-5">
            <h2 className="mb-4 text-xl font-semibold">Profile</h2>
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

          <div className="rounded-2xl border border-white/10 bg-[#252421] p-5">
            <h2 className="mb-4 text-xl font-semibold">Custom instructions</h2>
            <textarea
              className="min-h-44 w-full rounded-xl border border-white/10 bg-[#1d1c1a] px-4 py-3 text-[#f4f1ea] outline-none placeholder:text-[#aaa49a] focus:border-white/35"
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value)}
              placeholder="Tell Theo how to respond across chats"
            />
            <button className="primary-btn mt-4" onClick={saveSettings}>
              <Save size={18} />
              Save instructions
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

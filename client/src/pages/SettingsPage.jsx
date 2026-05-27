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
    <div className="min-h-screen px-4 py-6 pb-24 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-ink/60 dark:text-paper/60">Profile, theme, and persistent chat behavior.</p>
        </header>

        {notice && <p className="mb-4 rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">{notice}</p>}

        <section className="grid gap-5">
          <div className="rounded-md border border-line bg-white p-5 dark:border-white/10 dark:bg-white/5">
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

          <div className="rounded-md border border-line bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-4 text-xl font-semibold">Custom instructions</h2>
            <textarea
              className="min-h-44 w-full rounded-md border border-line bg-paper px-4 py-3 outline-none focus:border-ocean dark:border-white/10 dark:bg-ink"
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

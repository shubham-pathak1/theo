import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    try {
      await api.post("/api/auth/reset-password", {
        token: params.get("token") || "",
        password
      });
      setNotice("Password updated. You can sign in now.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#111111] px-4 text-[#f4f1ea]">
      <form className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8" onSubmit={submit}>
        <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-white/55">Choose a new Theo password.</p>
        <input
          className="mt-6 h-11 w-full rounded-md border border-white/10 bg-black px-3 text-sm outline-none focus:border-white/35"
          type="password"
          minLength={8}
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {notice && <p className="mt-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">{notice}</p>}
        <button className="mt-5 h-11 w-full rounded-md bg-[#f4f1ea] text-sm font-semibold text-black">Update password</button>
        <Link className="mt-4 block text-center text-sm text-white/55 hover:text-white" to="/auth">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);
  const { updateUser } = useAuth();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const token = params.get("token");
    if (!token) {
      setStatus("Verification token missing.");
      return;
    }

    api
      .post("/api/auth/verify-email", { token })
      .then(({ user }) => {
        setSuccess(true);
        updateUser(user);
        setStatus("Email verified. You can continue using Theo.");
      })
      .catch((error) => {
        setSuccess(false);
        setStatus(error.message);
      });
  }, [params, updateUser]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#111111] px-4 text-[#f4f1ea]">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Theo</h1>
        <p className={`mt-4 ${success ? "text-emerald-200" : "text-white/65"}`}>{status}</p>
        <Link className="mt-6 inline-flex rounded-md bg-[#f4f1ea] px-4 py-2 text-sm font-semibold text-black" to="/auth">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}

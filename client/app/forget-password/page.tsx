"use client";
 
import Link from "next/link";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { api } from "@/lib/axios";
import axios from "axios";
import { forgotPasswordSchema } from "@/lib/schemas/forgot-password.schema";
 
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [serverError, setServerError] = useState("");
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: { onChange: forgotPasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        await api.post("/auth/forgot-password", { email: value.email });
        setSubmittedEmail(value.email);
        setSent(true);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setServerError(
            error.response?.data?.message || "There is an error while trying to change password"
          );
        }
      }
    },
  });
 
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f8] text-[#1b1c1c]">
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl text-red-700 text-center">IN PROGRESS!!!</h1>
          <h2 className="text-2xl font-black text-[#0a66c2]">CareerPath</h2>
        </div>
        <div className="w-full max-w-100 bg-white border border-[#c1c6d4] rounded-lg p-8 shadow-sm">
          {!sent ? (
            <>
              <div className="mb-4">
                <h2 className="text-xl text-center font-semibold text-[#1b1c1c] mb-2">
                  Forgot password
                </h2>
                <p className="text-sm text-center text-[#414752]">
                  Enter your email to send you a link for a password reset.
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
                className="flex flex-col gap-6"
              >
                <form.Field name="email">
                  {(field) => (
                    <div className="flex flex-col gap-1 group">
                      <label
                        htmlFor="email"
                        className="text-xs font-semibold tracking-wide text-[#414752] group-focus-within:text-[#004e99] transition-colors"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        placeholder="example@domain.com"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="w-full h-11 px-4 rounded border border-[#c1c6d4] bg-white text-sm text-[#1b1c1c] outline-none focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] transition-all"
                      />
                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <span className="text-xs text-[#ba1a1a] mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </form.Field>
                {serverError && (
                  <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg">
                    {serverError}
                  </p>
                )}
                <form.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="w-full h-12 bg-[#0a66c2] hover:brightness-110 cursor-pointer active:opacity-70 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full transition-all"
                    >
                      Send Link
                    </button>
                  )}
                </form.Subscribe>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#1b1c1c] mb-2">
                Check your email.
              </h2>
              <p className="text-sm text-[#414752]">
                We sent you a link for a password reset on{" "}
                <span className="font-semibold text-[#1b1c1c]">
                  {submittedEmail}
                </span>
                . Link expires in 1 hour.
              </p>
            </div>
          )}
          <div className="mt-8 text-center border-t border-[#c1c6d4] pt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0a66c2] hover:underline transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Log In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
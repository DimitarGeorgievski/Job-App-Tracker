"use client";
import { api } from "@/lib/axios";
import { loginSchema } from "@/lib/schemas/auth.schema";
import { useForm } from "@tanstack/react-form";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        await api.post("/auth/login", {
          email: value.email,
          password: value.password,
        });
        router.push("/");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setServerError(
            error.response?.data?.message || "Invalid credentials",
          );
        }
      }
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex flex-1">
        <section className="hidden lg:flex flex-1 flex-col justify-center p-20 bg-[#004e99] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <Image
              src="https://res.cloudinary.com/diosuibyw/image/upload/v1778446143/unnamed_fqukaw.png"
              alt="Professional Office Environment"
              fill
              sizes=""
              loading="eager"
              className="object-cover"
            />
          </div>
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-white p-2 rounded-lg text-[#004e99]">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </div>
              <span className="text-2xl mb-xl font-bold">CareerPath</span>
            </div>

            <h2 className="text-[40px] leading-tight font-extrabold mt-6">
              Unlock your professional potential.
            </h2>
            <p className="text-lg text-white/80 leading-relaxed mt-6">
              Join over 12 million professionals tracking their career journey
              with data-driven insights and structured workflows.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-8">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8cb7ff"
                  strokeWidth="2"
                  className="mb-2"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <div className="font-bold">Career Tracking</div>
                <div className="text-white/60">
                  Visualize your path forward.
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8cb7ff"
                  strokeWidth="2"
                  className="mb-2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <line x1="3" y1="12" x2="9" y2="12" />
                  <line x1="15" y1="12" x2="21" y2="12" />
                  <line x1="12" y1="3" x2="12" y2="9" />
                  <line x1="12" y1="15" x2="12" y2="21" />
                </svg>
                <div className="font-bold">Network Smart</div>
                <div className="text-white/60">Connect with intent.</div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-10 left-10 texl-2xl text-white/40">
            © 2024 CareerPath Platform. Professional Edition.
          </div>
        </section>
        <section className="flex flex-1 flex-col justify-center items-center px-6 bg-white">
          <div className="flex lg:hidden flex-col items-center gap-2 mb-8">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#004e99"
              strokeWidth="2"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            <span className="text-xl font-bold text-[#004e99]">CareerPath</span>
          </div>
          <div className="w-full max-w-100">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1 text-[#1b1c1c]">
                Sign in
              </h1>
              <p className="text-base text-[#414752]">
                Stay updated on your professional world.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="flex flex-col gap-4"
            >
              <form.Field name="email">
                {(field) => (
                  <div className="flex flex-col gap-1 group">
                    <label className="text-xs font-semibold tracking-wide text-[#414752] group-focus-within:text-[#004e99] transition-colors">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full px-4 py-2 border border-[#c1c6d4] rounded-lg bg-white text-base text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all"
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
              <form.Field name="password">
                {(field) => (
                  <div className="flex flex-col gap-1 group">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold tracking-wide text-[#414752] group-focus-within:text-[#004e99] transition-colors">
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-[#004e99] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="w-full px-4 py-2 pr-11 border border-[#c1c6d4] rounded-lg bg-white text-base text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#414752] hover:text-[#004e99] transition-colors"
                      >
                        {showPassword ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0 && (
                        <span className="text-xs text-[#ba1a1a] mt-0.5">
                          {field.state.meta.errors[0]?.message}
                        </span>
                      )}
                  </div>
                )}
              </form.Field>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 accent-[#004e99] cursor-pointer"
                />
                <label
                  htmlFor="remember"
                  className="text-base text-[#414752] cursor-pointer"
                >
                  Remember me
                </label>
              </div>
              {serverError && (
                <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg">
                  {serverError}
                </p>
              )}
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="w-full bg-[#004e99] hover:bg-[#00468a] disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-full text-sm font-semibold transition-colors mt-1"
                  >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </button>
                )}
              </form.Subscribe>
            </form>
            <div className="mt-8 text-center">
              <p className="text-base text-[#414752]">
                New to CareerPath?{" "}
                <Link
                  href="/register"
                  className="text-[#004e99] font-semibold hover:underline"
                >
                  Register now
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

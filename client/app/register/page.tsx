"use client";
import { api } from "@/lib/axios";
import { companySchema, userSchema } from "@/lib/schemas/register.schema";
import { useForm } from "@tanstack/react-form";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [serverError, setServerError] = useState("");
  const [activeTab, setActiveTab] = useState<"company" | "user">("user");
  const [showPassword, setShowPassword] = useState(false);
  const companyForm = useForm({
    defaultValues: {
      companyName: "",
      industry: "",
      website: "",
      location: "",
      description: "",
      email: "",
      password: "",
    },
    validators: { onChange: companySchema },
    onSubmit: async ({ value }) => {
      setServerError("");
      console.log(value);
      try {
        await api.post("/auth/register/company", {
          name: value.companyName,
          industry: value.industry,
          website: value.website,
          location: value.location,
          description: value.description,
          email: value.email,
          password: value.password,
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setServerError(
            error.response?.data?.message ||
              "Try again, there is something wrong",
          );
        }
      }
    },
  });
  const userForm = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
    validators: { onChange: userSchema },
    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        await api.post("/auth/register/company", {
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          password: value.password,
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setServerError(
            error.response?.data?.message ||
              "Try again, there is something wrong",
          );
        }
      }
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex flex-1">
        <section className="hidden lg:flex md:w-[45%] lg:w-[40%] flex-col justify-center bg-[#004e99] text-white relative overflow-hidden">
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
          <div className="relative m-20 z-10 max-w-2xl">
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
            <h2 className="text-[50px] leading-tight font-extrabold mt-6">
              Empower your professional journey.
            </h2>
            <p className="text-base text-white/80 leading-relaxed mt-6">
              Join a community of thousands of professionals building their
              future with CareerPath&apos;s advanced recruiting and career
              tracking tools.
            </p>
          </div>
          <p className="absolute bottom-10 left-10 texl-2xl text-white/40">
            © 2024 CareerPath Platform. Professional Edition.
          </p>
        </section>
        <section className="flex-1 flex flex-col justify-center items-center px-6 py-8 bg-[#fbf9f8] overflow-y-auto">
          <div className="w-full max-w-130">
            <div className="md:hidden flex items-center justify-center gap-2 mb-6">
              <div className="bg-[#004e99] p-1.5 rounded-lg text-white">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </div>
              <span className="text-lg font-extrabold text-[#004e99]">
                CareerPath
              </span>
            </div>
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-[#1b1c1c] tracking-tight">
                Create your account
              </h1>
              <p className="text-sm text-[#414752] mt-1">
                Start your professional journey today.
              </p>
            </div>
            <div className="relative flex p-1 bg-[#f5f3f3] rounded-xl mb-6 overflow-hidden">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white shadow transition-all duration-300 ease-in-out ${
                  activeTab === "company" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setActiveTab("user");
                  setServerError("");
                  setShowPassword(false);
                }}
                className={`relative z-10 flex-1 py-2 cursor-pointer text-sm font-semibold rounded-lg transition-colors duration-300 ${
                  activeTab === "user"
                    ? "text-[#004e99]"
                    : "text-[#414752] hover:text-[#1b1c1c]"
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("company");
                  setServerError("");
                  setShowPassword(false);
                }}
                className={`relative z-10 flex-1 py-2 text-sm cursor-pointer font-semibold rounded-lg transition-colors duration-300 ${
                  activeTab === "company"
                    ? "text-[#004e99]"
                    : "text-[#414752] hover:text-[#1b1c1c]"
                }`}
              >
                Company
              </button>
            </div>
            {activeTab === "user" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  userForm.handleSubmit();
                }}
                className="flex flex-col gap-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <userForm.Field name="firstName">
                    {(field) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                          First Name
                        </label>
                        <input
                          className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                          placeholder="John"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0 && (
                            <span className="text-xs text-[#ba1a1a] pl-1 mt-0.5">
                              {field.state.meta.errors[0]?.message}
                            </span>
                          )}
                      </div>
                    )}
                  </userForm.Field>
                  <userForm.Field name="lastName">
                    {(field) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                          Last Name
                        </label>
                        <input
                          className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                          placeholder="Doe"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0 && (
                            <span className="text-xs text-[#ba1a1a] pl-1 mt-0.5">
                              {field.state.meta.errors[0]?.message}
                            </span>
                          )}
                      </div>
                    )}
                  </userForm.Field>
                </div>
                <userForm.Field name="email">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                        placeholder="john.doe@email.com"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <span className="text-xs text-[#ba1a1a] pl-1 mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </userForm.Field>
                <userForm.Field name="password">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="w-full h-14 px-4 pr-12 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                          placeholder="••••••••"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 cursor-pointer -translate-y-1/2 text-[#414752] hover:text-[#004e99] transition-colors"
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
                          <span className="text-xs text-[#ba1a1a] pl-1 mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </userForm.Field>
                {serverError && (
                  <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg">
                    {serverError}
                  </p>
                )}
                <userForm.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="w-full h-14 bg-[#004e99] cursor-pointer hover:bg-[#00468a] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      Register
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  )}
                </userForm.Subscribe>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  companyForm.handleSubmit();
                }}
                className="flex flex-col gap-5"
              >
                <companyForm.Field name="companyName">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                        Company Name
                      </label>
                      <input
                        className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                        placeholder="Techno solutions"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <span className="text-xs pl-1 text-[#ba1a1a] mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </companyForm.Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <companyForm.Field name="industry">
                    {(field) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                          Industry
                        </label>
                        <div className="relative">
                          <select
                            className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783] appearance-none"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          >
                            <option value="">Choose Industry</option>
                            <option value="it">IT & Technology</option>
                            <option value="finance">Finance</option>
                            <option value="marketing">Marketing</option>
                            <option value="education">Education</option>
                            <option value="other">Other</option>
                          </select>
                          <svg
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#414752]"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                        {field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0 && (
                            <span className="text-xs pl-1 text-[#ba1a1a] mt-0.5">
                              {field.state.meta.errors[0]?.message}
                            </span>
                          )}
                      </div>
                    )}
                  </companyForm.Field>
                  <companyForm.Field name="website">
                    {(field) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                          Website
                        </label>
                        <input
                          type="url"
                          className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                          placeholder="https://company.com"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />

                        {field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0 && (
                            <span className="text-xs pl-1 text-[#ba1a1a] mt-0.5">
                              {field.state.meta.errors[0]?.message}
                            </span>
                          )}
                      </div>
                    )}
                  </companyForm.Field>
                </div>
                <companyForm.Field name="location">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                        Location
                      </label>
                      <input
                        className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                        placeholder="Skopje, Macedonia"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />

                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <span className="text-xs pl-1 text-[#ba1a1a] mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </companyForm.Field>
                <companyForm.Field name="description">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                        Description
                      </label>
                      <textarea
                        className="w-full min-h-30 p-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783] resize-none"
                        placeholder="Company Description..."
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />

                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <span className="text-xs pl-1 text-[#ba1a1a] mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </companyForm.Field>
                <companyForm.Field name="email">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                        Email
                      </label>

                      <input
                        type="email"
                        className="w-full h-14 px-4 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                        placeholder="contact@company.mk"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />

                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <span className="text-xs pl-1 text-[#ba1a1a] mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </companyForm.Field>
                <companyForm.Field name="password">
                  {(field) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] pl-1 font-bold uppercase tracking-widest text-[#414752]">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="w-full h-14 px-4 pr-12 bg-white border border-[#c1c6d4] rounded-lg text-sm text-[#1b1c1c] outline-none focus:border-[#004e99] focus:ring-2 focus:ring-[#004e99]/20 transition-all placeholder:text-[#727783]"
                          placeholder="••••••••"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
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
                          <span className="text-xs pl-1 text-[#ba1a1a] mt-0.5">
                            {field.state.meta.errors[0]?.message}
                          </span>
                        )}
                    </div>
                  )}
                </companyForm.Field>
                {serverError && (
                  <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg">
                    {serverError}
                  </p>
                )}
                <companyForm.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="w-full h-14 bg-[#004e99] hover:bg-[#00468a] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      Register Company
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  )}
                </companyForm.Subscribe>
              </form>
            )}
            <p className="text-center text-sm text-[#414752] mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#004e99] font-bold hover:underline"
              >
                Log In
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

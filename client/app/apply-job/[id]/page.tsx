"use client";
import { api } from "@/app/lib/axios";
import { User } from "@/app/lib/hooks/user";
import { applySchema } from "@/app/lib/schemas/applyJob.schema";
import Footer from "@/components/footer/Footer";
import Navbar from "@/components/navbar/Navbar";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type Step = 1 | 2 | 3;

export default function ApplyJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: user } = User();
  const [step, setStep] = useState<Step>(1);
  const [serverError, setServerError] = useState("");
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get(`/jobs/${id}`).then((r) => r.data),
  });
  const form = useForm({
    defaultValues: {
      phone: "",
      coverLetter: "",
      terms: false,
      notes: "",
    },
    validators: { onChange: applySchema },
    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        const formData = new FormData();
        formData.append("jobId", String(Number(id)));
        formData.append("userId", String(Number(user?.id)));
        formData.append("notes", value.notes);
        formData.append("phone", value.phone);
        formData.append("coverLetter", value.coverLetter);
        if (coverLetterFile) formData.append("file", value.coverLetter);
        await api.post("/applications", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setStep(3);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setServerError(error.response?.data?.error || "Something went wrong");
        }
      }
    },
  });
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f8] pt-24">
      <Navbar />
      <div className="max-w-282 flex-1 pb-6 mx-auto">
        <div className="bg-white rounded-xl border border-[#c1c6d4] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#c1c6d4] bg-white flex justify-between items-start">
            <div className="flex gap-6">
              <div className="relative w-16 h-16 rounded-lg border border-[#c1c6d4] bg-[#efeded] shrink-0 overflow-hidden">
                {job?.company?.user?.logoURL && (
                  <Image
                    src={job.company.user.logoURL}
                    alt="Company Logo"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#1b1c1c]">
                  {job?.title}
                </h1>
                <p className="text-sm text-[#414752]">
                  {job?.company?.companyName} • {job?.location}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-[#004e99]/10 text-[#004e99] px-2 py-0.5 rounded-full text-xs font-semibold">
                    {job?.jobType?.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="text-[#414752] hover:bg-[#efeded] p-2 rounded-full transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-4 border-r border-[#c1c6d4] bg-[#f5f3f3] p-6">
              <h3 className="text-base font-semibold mb-6">
                Application Progress
              </h3>
              <div className="space-y-4">
                {[
                  {
                    num: 1,
                    label: "Personal Info",
                    sub: step > 1 ? "Completed" : "In Progress",
                  },
                  {
                    num: 2,
                    label: "Cover Letter",
                    sub:
                      step > 2
                        ? "Completed"
                        : step === 2
                          ? "In Progress"
                          : "Pending",
                  },
                  {
                    num: 3,
                    label: "Review",
                    sub: step === 3 ? "Submitted" : "Pending",
                  },
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`flex items-center gap-4 ${step < s.num ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        step > s.num
                          ? "bg-[#004e99] text-white"
                          : step === s.num
                            ? "bg-[#004e99] text-white"
                            : "border-2 border-[#c1c6d4] text-[#414752]"
                      }`}
                    >
                      {step > s.num ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        s.num
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1b1c1c]">
                        {s.label}
                      </p>
                      <p className="text-xs text-[#414752]">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-8 p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (step === 1) {
                    if (!(form.state.values.notes && form.state.values.phone)) return;
                    setStep(2);
                    return;
                  }
                  if (step === 2) {
                    form.handleSubmit();
                  }
                }}
              >
                <h2 className="text-xl font-semibold mb-6">
                  Submit Your Application
                </h2>
                {step === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <form.Field name="notes">
                      {(field) => (
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#414752]">
                            Email Address
                          </label>
                          <input
                            type="email"
                            className="w-full bg-white border border-[#c1c6d4] rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] transition-all"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          {field.state.meta.isTouched &&
                            field.state.meta.errors.length > 0 && (
                              <span className="text-xs text-[#ba1a1a]">
                                {field.state.meta.errors[0]?.message}
                              </span>
                            )}
                        </div>
                      )}
                    </form.Field>
                    <form.Field name="phone">
                      {(field) => (
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#414752]">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            className="w-full bg-white border border-[#c1c6d4] rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] transition-all"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          {field.state.meta.isTouched &&
                            field.state.meta.errors.length > 0 && (
                              <span className="text-xs text-[#ba1a1a]">
                                {field.state.meta.errors[0]?.message}
                              </span>
                            )}
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
                {step === 2 && (
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-sm font-semibold text-[#1b1c1c]">
                        Cover Letter
                      </label>
                      <span className="text-xs text-[#414752]">
                        Optional but recommended
                      </span>
                    </div>
                    <div className="flex flex-col gap-4">
                      <label
                        htmlFor="coverLetterFile"
                        className="border-2 border-dashed border-[#c1c6d4] rounded-xl p-8 flex flex-col items-center justify-center bg-white hover:bg-[#f5f3f3] transition-colors cursor-pointer group"
                      >
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#727783"
                          strokeWidth="1.5"
                          className="mb-2 group-hover:stroke-[#004e99]"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                        <p className="text-sm font-semibold text-[#1b1c1c] text-center">
                          {coverLetterFile
                            ? coverLetterFile.name
                            : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-[#414752] text-center">
                          PDF, DOCX (Max 5MB)
                        </p>
                        <input
                          id="coverLetterFile"
                          type="file"
                          accept=".pdf,.docx"
                          className="hidden"
                          onChange={(e) =>
                            setCoverLetterFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      <div className="flex items-center gap-4 py-2">
                        <div className="h-px bg-[#c1c6d4] grow" />
                        <span className="text-xs font-semibold text-[#414752] uppercase tracking-wider">
                          or write below
                        </span>
                        <div className="h-px bg-[#c1c6d4] grow" />
                      </div>
                      <form.Field name="coverLetter">
                        {(field) => (
                          <textarea
                            className="w-full h-48 bg-white border border-[#c1c6d4] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] transition-all resize-none leading-relaxed"
                            placeholder="Write a brief introduction about your experience and why you're a fit for this role..."
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                    </div>
                    <form.Field name="terms">
                      {(field) => (
                        <div className="mt-6">
                          <div className="bg-[#f5f3f3] p-4 rounded-xl border border-[#c1c6d4]">
                            <div className="flex gap-3">
                              <input
                                id="terms"
                                type="checkbox"
                                checked={field.state.value}
                                onChange={(e) =>
                                  field.handleChange(e.target.checked)
                                }
                                className="mt-0.5 w-5 h-5 accent-[#004e99] cursor-pointer"
                              />
                              <label
                                htmlFor="terms"
                                className="text-xs text-[#414752] cursor-pointer leading-relaxed"
                              >
                                I agree to the{" "}
                                <Link
                                  href="/in-work"
                                  className="text-[#004e99] font-semibold"
                                >
                                  Privacy Policy
                                </Link>{" "}
                                and authorize CareerPath to share my profile
                                with {job?.company?.companyName} for this
                                specific role.
                              </label>
                            </div>
                            {field.state.meta.isTouched &&
                              field.state.meta.errors.length > 0 && (
                                <span className="text-xs text-[#ba1a1a] mt-1 block">
                                  {field.state.meta.errors[0]?.message}
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
                {step === 3 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-[#1b1c1c] mb-2">
                      Application Submitted!
                    </h2>
                    <p className="text-sm text-[#414752] mb-6">
                      Your application for <strong>{job?.title}</strong> at{" "}
                      <strong>{job?.company?.companyName}</strong> has been
                      submitted successfully.
                    </p>
                    <Link
                      href="/"
                      className="inline-block bg-[#004e99] text-white text-sm font-semibold px-8 py-3 rounded-full hover:bg-[#00468a] transition-colors"
                    >
                      Back to Jobs
                    </Link>
                  </div>
                )}
                {serverError && (
                  <p className="text-sm text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-lg mb-4">
                    {serverError}
                  </p>
                )}
                {step !== 3 && (
                  <div className="flex justify-end gap-4 mt-6">
                    {step === 2 && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-8 py-3 rounded-full border border-[#004e99] text-[#004e99] text-sm font-semibold hover:bg-[#004e99]/5 transition-all"
                      >
                        Back
                      </button>
                    )}
                    <form.Subscribe
                      selector={(s) => [s.canSubmit, s.isSubmitting]}
                    >
                      {([canSubmit, isSubmitting]) => (
                        <button
                          type="submit"
                          disabled={step === 2 && (!canSubmit || isSubmitting)}
                          className="px-8 py-3 rounded-full cursor-pointer bg-[#004e99] text-white text-sm font-semibold hover:bg-[#00468a] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                          Submit Application
                        </button>
                      )}
                    </form.Subscribe>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

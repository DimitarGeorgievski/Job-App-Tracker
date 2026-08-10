"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { parse } from "date-fns";
import { skillSchema } from "@/app/lib/schemas/skill.schema";
import { api } from "@/app/lib/axios";
import Image from "next/image";
import { experienceSchema } from "@/app/lib/schemas/experience.schema";
import { queryClient } from "@/app/lib/queryClient";
import { educationSchema } from "@/app/lib/schemas/education.schema";
import { User } from "@/app/lib/hooks/user";

interface Company {
  id: number;
  companyName: string;
  industry?: string;
  location?: string;
  user: {
    logoURL: string;
  }
}

interface ModalProps {
  onClose: () => void;
}
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => currentYear + 5 - i);

function toDate(month: string, year: string): Date {
  return parse(`${month} ${year}`, "MMMM yyyy", new Date());
}

export default function CreateSkillModal({ onClose }: ModalProps) {
  const { data: user } = User();
  const form = useForm({
    defaultValues: { skills: "" },
    onSubmit: async ({ value }) => {
      const parsed = skillSchema.safeParse(value);
      if (!parsed.success) return;
      await api.patch(`/user/${user?.id}`, { skills: parsed.data.skills.trim() });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-186 rounded-lg shadow-xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c1c6d4]">
          <h2 className="text-xl font-semibold">Add Skill</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#f5f3f3] cursor-pointer rounded-full transition-colors"
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="p-6">
            <form.Field name="skills">
              {(field) => (
                <div>
                  <label className="block text-sm font-semibold text-[#414752] mb-1">
                    Skill <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="e.g. React, TypeScript, Project Management..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full border border-[#c1c6d4] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] outline-none"
                  />
                  {field.state.meta.errors?.[0] && (
                    <p className="text-md text-red-500 mt-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>
          <form.Subscribe
            selector={(s) => ({
              isSubmitting: s.isSubmitting,
              canSubmit: s.canSubmit,
            })}
          >
            {({ isSubmitting, canSubmit }) => (
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#c1c6d4]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-sm cursor-pointer font-semibold text-[#004e99] hover:bg-[#f5f3f3] rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="px-6 py-2 text-sm cursor-pointer font-semibold text-white bg-[#0a66c2] hover:bg-[#004e99] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}

export function CreateExperienceModal({ onClose }: ModalProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const form = useForm({
    defaultValues: {
      title: "",
      companyId: 0,
      companyName: "",
      location: "",
      isCurrent: false,
      startMonth: "",
      startYear: "",
      endMonth: "",
      endYear: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = experienceSchema.safeParse(value);
      if (!parsed.success) return;
      const {
        title,
        companyId,
        location,
        isCurrent,
        startMonth,
        startYear,
        endMonth,
        endYear,
        description,
      } = parsed.data;
      await api.post("/experience", {
        title,
        companyId,
        location,
        description,
        start: toDate(startMonth, startYear),
        end: isCurrent ? new Date() : toDate(endMonth!, endYear!),
      });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      onClose();
    },
  });
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(
          `/user/companies?name=${encodeURIComponent(companyQuery)}`,
        );
        setCompanies(res.data ?? []);
        setShowDropdown(true);
      } catch {
        setCompanies([]);
      }
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [companyQuery]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-186 rounded-lg shadow-xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c1c6d4]">
          <h2 className="text-xl font-semibold">Add Experience</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#f5f3f3] cursor-pointer  rounded-full transition-colors"
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <form.Field name="title">
              {(field) => (
                <div>
                  <label className="block text-sm font-semibold text-[#414752] mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="e.g. Senior Product Manager"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full border border-[#c1c6d4] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] outline-none"
                  />
                  {field.state.meta.errors?.[0] && (
                    <p className="text-md text-red-500 mt-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
            <form.Field name="companyId">
              {(Company) => (
                <form.Field name="companyName">
                  {(companyNameField) => (
                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-sm font-semibold text-[#414752] mb-1">
                        Company <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          placeholder="Search company..."
                          value={companyQuery}
                          onChange={(e) => {
                            setCompanyQuery(e.target.value);
                            if (Company.state.value) {
                              Company.handleChange(0);
                              companyNameField.handleChange("");
                            }
                          }}
                          className="w-full border border-[#c1c6d4] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] outline-none"
                        />
                        {Company.state.value > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              Company.handleChange(0);
                              companyNameField.handleChange("");
                              setCompanyQuery("");
                            }}
                            className="absolute right-3 cursor-pointer top-1/2 -translate-y-1/2 text-[#727783] hover:text-[#1b1c1c]"
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
                        )}
                      </div>
                      {showDropdown && (
                        <div className="absolute z-10 top-full left-0 right-0 bg-white border border-[#c1c6d4] shadow-lg mt-1 rounded-md max-h-48 overflow-y-auto">
                          {companies.length > 0 ? (
                            companies.map((company) => (
                              <div
                                key={company.id}
                                onClick={() => {
                                  Company.handleChange(company.id);
                                  companyNameField.handleChange(company.companyName);
                                  setCompanyQuery(company.companyName);
                                  setShowDropdown(false);
                                }}
                                className="p-3 hover:bg-[#f5f3f3] cursor-pointer flex items-center gap-3 border-b border-[#c1c6d4] last:border-0"
                              >
                                {company.user?.logoURL ? (
                                  <Image
                                    width={32}
                                    height={32}
                                    src={company.user.logoURL}
                                    alt={company.companyName}
                                    className="rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-[#efeded] rounded flex items-center justify-center">
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#414752"
                                      strokeWidth="2"
                                    >
                                      <rect
                                        x="2"
                                        y="7"
                                        width="20"
                                        height="14"
                                        rx="2"
                                      />
                                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                                    </svg>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-semibold">
                                    {company.companyName}
                                  </p>
                                  {(company.industry || company.location) && (
                                    <p className="text-md text-[#414752]">
                                      {[company.industry, company.location]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[#414752] p-3">
                              No results for &quot;{companyQuery}&quot;
                            </p>
                          )}
                        </div>
                      )}
                      {Company.state.meta.errors?.[0] && (
                        <p className="text-md text-red-500 mt-1">
                          {Company.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              )}
            </form.Field>
            <form.Field name="location">
              {(field) => (
                <div>
                  <label className="block text-sm font-semibold text-[#414752] mb-1">
                    Location
                  </label>
                  <input
                    placeholder="e.g. Skopje, Macedonia"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full border border-[#c1c6d4] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] outline-none"
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="isCurrent">
              {(field) => (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCurrent"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="rounded text-[#004e99] focus:ring-[#004e99]"
                  />
                  <label htmlFor="isCurrent" className="text-sm">
                    I currently work here
                  </label>
                </div>
              )}
            </form.Field>
            <form.Subscribe selector={(s) => s.values.isCurrent}>
              {(isCurrent) => (
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="startMonth">
                    {(startMonthField) => (
                      <form.Field name="startYear">
                        {(startYearField) => (
                          <div>
                            <label className="block text-sm font-semibold text-[#414752] mb-1">
                              Start <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={startMonthField.state.value}
                                onChange={(e) =>
                                  startMonthField.handleChange(e.target.value)
                                }
                                className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none"
                              >
                                <option value="">Month</option>
                                {MONTHS.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={startYearField.state.value}
                                onChange={(e) =>
                                  startYearField.handleChange(e.target.value)
                                }
                                className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none"
                              >
                                <option value="">Year</option>
                                {YEARS.map((y) => (
                                  <option key={y} value={String(y)}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </form.Field>
                    )}
                  </form.Field>
                  <form.Field name="endMonth">
                    {(endMonthField) => (
                      <form.Field name="endYear">
                        {(endYearField) => (
                          <div>
                            <label className="block text-sm font-semibold text-[#414752] mb-1">
                              End
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={endMonthField.state.value}
                                onChange={(e) =>
                                  endMonthField.handleChange(e.target.value)
                                }
                                disabled={isCurrent}
                                className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none disabled:bg-[#f5f3f3] disabled:cursor-not-allowed"
                              >
                                <option value="">
                                  {isCurrent ? "Now" : "Month"}
                                </option>
                                {!isCurrent &&
                                  MONTHS.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                              </select>
                              <select
                                value={endYearField.state.value}
                                onChange={(e) =>
                                  endYearField.handleChange(e.target.value)
                                }
                                disabled={isCurrent}
                                className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none disabled:bg-[#f5f3f3] disabled:cursor-not-allowed"
                              >
                                <option value="">
                                  {isCurrent ? "—" : "Year"}
                                </option>
                                {!isCurrent &&
                                  YEARS.map((y) => (
                                    <option key={y} value={String(y)}>
                                      {y}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </form.Field>
                    )}
                  </form.Field>
                </div>
              )}
            </form.Subscribe>
            <form.Field name="description">
              {(field) => (
                <div>
                  <label className="block text-sm font-semibold text-[#414752] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe your responsibilities and achievements..."
                    className="w-full border border-[#c1c6d4] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] outline-none resize-none"
                  />
                </div>
              )}
            </form.Field>
          </div>
          <form.Subscribe
            selector={(s) => ({
              isSubmitting: s.isSubmitting,
              canSubmit: s.canSubmit,
            })}
          >
            {({ isSubmitting, canSubmit }) => (
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#c1c6d4]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-semibold cursor-pointer text-[#004e99] hover:bg-[#f5f3f3] rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="px-6 py-2 text-sm font-semibold cursor-pointer text-white bg-[#0a66c2] hover:bg-[#004e99] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
export function CreateEducationModal({ onClose }: ModalProps) {
  const form = useForm({
    defaultValues: {
      title: "",
      department: "",
      startMonth: "",
      startYear: "",
      endMonth: "",
      endYear: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = educationSchema.safeParse(value);
      if (!parsed.success) return;
      const { title, department, startMonth, startYear, endMonth, endYear } =
        parsed.data;
      await api.post("/education", {
        title,
        department,
        start: toDate(startMonth, startYear),
        end: endMonth && endYear ? toDate(endMonth, endYear) : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-186 rounded-lg shadow-xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c1c6d4]">
          <h2 className="text-xl font-semibold">Add Education</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#f5f3f3] cursor-pointer rounded-full transition-colors"
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="p-6 space-y-5">
            <form.Field name="title">
              {(field) => (
                <div>
                  <label className="block text-sm font-semibold text-[#414752] mb-1">
                    School / Institution <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="e.g. University of Ss. Cyril and Methodius"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full border border-[#c1c6d4] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] outline-none"
                  />
                  {field.state.meta.errors?.[0] && (
                    <p className="text-md text-red-500 mt-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
            <form.Field name="department">
              {(field) => (
                <div>
                  <label className="block text-sm font-semibold text-[#414752] mb-1">
                    Field of Study / Department
                  </label>
                  <input
                    placeholder="e.g. Computer Science"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full border border-[#c1c6d4] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#004e99] focus:border-[#004e99] outline-none"
                  />
                </div>
              )}
            </form.Field>
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="startMonth">
                {(startMonthField) => (
                  <form.Field name="startYear">
                    {(startYearField) => (
                      <div>
                        <label className="block text-sm font-semibold text-[#414752] mb-1">
                          Start <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={startMonthField.state.value}
                            onChange={(e) =>
                              startMonthField.handleChange(e.target.value)
                            }
                            className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none"
                          >
                            <option value="">Month</option>
                            {MONTHS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <select
                            value={startYearField.state.value}
                            onChange={(e) =>
                              startYearField.handleChange(e.target.value)
                            }
                            className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none"
                          >
                            <option value="">Year</option>
                            {YEARS.map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </form.Field>
                )}
              </form.Field>
              <form.Field name="endMonth">
                {(endMonthField) => (
                  <form.Field name="endYear">
                    {(endYearField) => (
                      <div>
                        <label className="block text-sm font-semibold text-[#414752] mb-1">
                          End
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={endMonthField.state.value}
                            onChange={(e) =>
                              endMonthField.handleChange(e.target.value)
                            }
                            className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none"
                          >
                            <option value="">Month</option>
                            {MONTHS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <select
                            value={endYearField.state.value}
                            onChange={(e) =>
                              endYearField.handleChange(e.target.value)
                            }
                            className="w-full border border-[#c1c6d4] rounded-md px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004e99] outline-none"
                          >
                            <option value="">Year</option>
                            {YEARS.map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </form.Field>
                )}
              </form.Field>
            </div>
          </div>
          <form.Subscribe
            selector={(s) => ({
              isSubmitting: s.isSubmitting,
              canSubmit: s.canSubmit,
            })}
          >
            {({ isSubmitting, canSubmit }) => (
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#c1c6d4]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-semibold cursor-pointer text-[#004e99] hover:bg-[#f5f3f3] rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="px-6 py-2 text-sm font-semibold text-white cursor-pointer bg-[#0a66c2] hover:bg-[#004e99] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}

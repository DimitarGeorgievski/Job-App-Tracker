"use client";
import Navbar from "@/components/navbar/Navbar";
import { User } from "./lib/hooks/user";
import Footer from "@/components/footer/Footer";
import Link from "next/link";
import { useState } from "react";
import { useJobs } from "./lib/hooks/useJobs";
import JobCard from "@/components/jobCard/JobCard";
import { JobType } from "./lib/models/job.model";
import Image from "next/image";
import { useJobStore } from "./lib/store/useJobStore";

const JOB_TYPE_OPTIONS: { label: string; value: JobType }[] = [
  { label: "Remote", value: JobType.REMOTE },
  { label: "On-site", value: JobType.ONSITE },
  { label: "Hybrid", value: JobType.HYBRID },
];
export default function Home() {
  const { toggleSavedJob, isSaved } = useJobStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    date: "any",
    jobType: "" as JobType | "",
    query: "",
    location: "",
  });
  const { data } = useJobs({
    page: currentPage,
    jobType: filters.jobType,
    date: filters.date,
    query: filters.query,
    location: filters.location,
  });
  const jobs = data?.jobs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const { data: user } = User();
  function handleDate(value: string) {
    setFilters((prev) => ({ ...prev, date: value }));
  }
  function handleJobType(value: JobType) {
    setFilters((prev) => ({
      ...prev,
      jobType: value,
    }));
  }
  function handleReset() {
    setFilters({
      date: "any",
      jobType: "" as JobType | "",
      query: "",
      location: "",
    });
    setCurrentPage(1);
  }
  function handleSearch(query: string, location: string) {
    setFilters((prev) => ({ ...prev, query, location }));
    setCurrentPage(1);
  }
  function getPages() {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f8] text-[#1b1c1c]">
      <Navbar user={user} onSearch={handleSearch} />
      <main className="pt-24 flex-1 pb-8 max-w-282 mx-auto px-6">
        <div className="grid grid-cols-12 gap-4 items-start">
          <aside className="hidden md:block col-span-3 sticky top-24 space-y-4 h-fit">
            <div className="bg-white border border-[#c1c6d4] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-[#c1c6d4]">
                <h2 className="text-base font-semibold">Filters</h2>
              </div>
              <div className="p-4 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                <div>
                  <span className="text-sm font-semibold block mb-2">
                    Date posted
                  </span>
                  <div className="space-y-2">
                    {[
                      { label: "Any time", value: "any" },
                      { label: "Past 24 hours", value: "24h" },
                      { label: "Past week", value: "week" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="date"
                          value={opt.value}
                          checked={filters.date === opt.value}
                          onChange={() => handleDate(opt.value)}
                          className="w-4 h-4 accent-[#004e99]"
                        />
                        <span className="text-sm text-[#414752] group-hover:text-[#1b1c1c]">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold block mb-2">
                    Job type
                  </span>
                  <div className="space-y-2">
                    {JOB_TYPE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="jobType"
                          value={opt.value}
                          checked={filters.jobType === opt.value}
                          onChange={() => handleJobType(opt.value)}
                          className="w-4 h-4 rounded accent-[#004e99]"
                        />
                        <span className="text-sm text-[#414752] group-hover:text-[#1b1c1c]">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="p-4 pb-0 border-t border-[#c1c6d4]">
                  <button
                    onClick={handleReset}
                    className="w-full cursor-pointer py-2 border border-[#c1c6d4] text-sm font-semibold text-[#414752] hover:border-[#004e99] hover:text-[#004e99] rounded-lg transition-colors"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-[#004e99]/10 p-4 rounded-lg border border-[#004e99]/20">
              <p className="text-sm font-semibold text-[#004e99]">
                Try CareerPath Premium
              </p>
              <p className="text-xs text-[#414752] mt-1">
                See how you compare to other applicants.
              </p>
              <Link
                href="/in-work"
                className="mt-4 w-full block text-center py-1.5 border border-[#004e99] text-[#004e99] text-sm font-semibold rounded-full hover:bg-[#004e99]/5 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </aside>
          <section className="col-span-12 md:col-span-9 lg:col-span-6 space-y-2">
            <div className="bg-white border border-[#c1c6d4] rounded-lg p-4 mb-4">
              <h1 className="text-xl font-semibold">Recommended for you</h1>
              <p className="text-xs text-[#414752]">
                Based on your profile and search history
              </p>
            </div>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSaved={isSaved}
                  onToggle={() => {
                    toggleSavedJob(job);
                  }}
                />
              ))
            ) : (
              <div className="bg-white border border-[#c1c6d4] rounded-lg p-8 text-center">
                <p className="text-sm text-[#414752]">No jobs found.</p>
              </div>
            )}
            <nav className="flex items-center justify-center py-8">
              <div className="flex items-center bg-white border border-[#c1c6d4] rounded-lg p-1 gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="flex items-center cursor-pointer px-3 py-2 text-[#414752] hover:bg-[#efeded] hover:text-[#004e99] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>
                <div className="flex items-center px-1">
                  {getPages().map((page, i) =>
                    page === "..." ? (
                      <span
                        key={`dots-${i}`}
                        className="w-10 h-10 flex items-center justify-center text-[#414752]"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-10 h-10 cursor-pointer flex items-center justify-center rounded text-sm font-semibold transition-colors ${
                          currentPage === page
                            ? "bg-[#004e99] text-white"
                            : "text-[#414752] hover:bg-[#efeded]"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="flex items-center cursor-pointer px-3 py-2 text-[#414752] hover:bg-[#efeded] hover:text-[#004e99] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  Next
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </nav>
          </section>
          <aside className="hidden lg:block col-span-3 sticky top-24 space-y-4 h-fit">
            <div className="bg-white border border-[#c1c6d4] rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold">Job Seeker Guidance</h2>
              </div>
              <p className="text-xs text-[#414752] mb-4">
                Recommended based on your activity
              </p>
              <div className="space-y-4">
                <Link href="/in-work" className="block group">
                  <p className="text-sm font-semibold group-hover:text-[#004e99] transition-colors">
                    I want to improve my resume
                  </p>
                  <p className="text-xs text-[#414752]">
                    Explore tailored tips for design roles.
                  </p>
                </Link>
                <Link href="/in-work" className="block group">
                  <p className="text-sm font-semibold group-hover:text-[#004e99] transition-colors">
                    Interview preparation
                  </p>
                  <p className="text-xs text-[#414752]">
                    Practice common questions for TPMs.
                  </p>
                </Link>
              </div>
            </div>
            <div className="bg-white border border-[#c1c6d4] rounded-lg p-4">
              <p className="text-xs text-center text-[#414752] mb-4">
                Advertisement
              </p>
              <div className="relative w-full aspect-square bg-[#efeded] rounded-lg overflow-hidden mb-4 border border-[#c1c6d4]">
                <Image
                  src="https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779045851/unnamed_e9kscn.png"
                  fill
                  sizes="(max-width: 1024px) 0px, 25vw"
                  alt="Advertisement"
                  className="object-cover"
                />
              </div>
              <p className="text-sm text-center font-semibold text-[#004e99]">
                Grow your skills with CareerPath Plus
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4">
              {["About", "Accessibility", "Help Center", "Privacy & Terms"].map(
                (item) => (
                  <Link
                    key={item}
                    href="#"
                    className="text-[11px] text-[#414752] hover:text-[#004e99] hover:underline"
                  >
                    {item}
                  </Link>
                ),
              )}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

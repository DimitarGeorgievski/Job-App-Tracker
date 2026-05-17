"use client";

import { user } from "@/app/lib/models/user.model";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  user?: user | null;
  onSearch?: (query: string, location: string) => void;
}

export default function Navbar({ onSearch, user }: NavbarProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  function handleSearch() {
    onSearch?.(query, location);
  }
  return (
    <header className="bg-white border-b border-[#c1c6d4] fixed top-0 w-full z-50">
      <div className="flex justify-between items-center w-full px-6 h-16 max-w-282 mx-auto">
        <div className="flex items-center gap-4 grow">
          <Link href="/">
            <span className="text-2xl font-semibold text-[#004e99]">
              CareerPath
            </span>
          </Link>
          <div className="hidden md:flex items-center bg-[#f5f3f3] px-4 py-1.5 rounded-lg w-full max-w-md border border-transparent focus-within:border-[#727783] focus-within:ring-1 focus-within:ring-[#727783] transition-all">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#414752"
              strokeWidth="2"
              className="mr-2 shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#727783]"
              placeholder="Search roles, skills, or companies"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <div className="h-6 w-px bg-[#c1c6d4] mx-2" />
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#414752"
              strokeWidth="2"
              className="mr-2 shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <input
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#727783]"
              placeholder="City, state, or zip"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>
        <nav className="flex items-center gap-8 ml-6">
          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/jobs"
              className="flex flex-col items-center text-[#004e99] border-b-2 border-[#004e99] p-1"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              <span className="text-xs font-semibold">Jobs</span>
            </Link>
            <Link
              href="/in-work"
              className="flex flex-col items-center text-[#414752] hover:bg-[#e9e8e7] p-1 rounded-lg transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-xs font-semibold">Network</span>
            </Link>
            <Link
              href="/in-work"
              className="flex flex-col items-center text-[#414752] hover:bg-[#e9e8e7] p-1 rounded-lg transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-xs font-semibold">Messaging</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 border-l border-[#c1c6d4] pl-6 flex-nowrap">
            <Link
              href={"/in-work"}
              className="text-[#414752] hover:bg-[#e9e8e7] p-1.5 rounded-full transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </Link>
            {user?.role === "USER" ? (
              <>
                <Link
                  href={"/in-work"}
                  className="text-[#414752] cursor-pointer hover:bg-[#e9e8e7] p-1.5 rounded-full transition-colors"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                  </svg>
                </Link>
                <Link
                  href={"/in-work"}
                  className="w-8 h-8 rounded-full bg-[#e9e8e7] overflow-hidden border border-[#c1c6d4] flex items-center justify-center cursor-pointer"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#414752"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </Link>
              </>
            ) : (
              <Link
                href={"/create-job"}
                className="bg-[#004e99] text-white text-sm font-semibold px-6 py-2 rounded-full hover:bg-[#004e99]/90 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                Create Job
              </Link>
            )}
            <Link href="/profile" className="shrink-0">
              {user?.logoURL ? (
                <Image
                  src={user.logoURL}
                  alt="user logo"
                  width={40}
                  height={40}
                  sizes="40px"
                  className="rounded-full object-cover border border-[#c1c6d4] w-10 h-10 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#e9e8e7] border border-[#c1c6d4] flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#414752"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

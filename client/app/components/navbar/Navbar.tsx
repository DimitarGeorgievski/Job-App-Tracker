"use client";

import { api } from "@/app/lib/axios";
import { user } from "@/app/lib/models/user.model";
import { queryClient } from "@/app/lib/queryClient";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavbarProps {
  user?: user | null;
  onSearch?: (query: string, location: string) => void;
}

export default function Navbar({ onSearch, user }: NavbarProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  function isActive(link: string) {
    return pathname === link;
  }
  function handleSearch() {
    onSearch?.(query, location);
  }
  async function handleLogout() {
    await api.post("/auth/logout");
    queryClient.clear();
    router.refresh();
    router.push("/login");
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
              href="/"
              className={`flex flex-col items-center p-1 transition-colors ${
                isActive("/")
                  ? "text-[#004e99] border-b-2 border-[#004e99]"
                  : "text-[#414752] hover:bg-[#e9e8e7] rounded-lg"
              }`}
            >
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.5 3V2.5C5.5 1.39543 6.39543 0.5 7.5 0.5C8.60457 0.5 9.5 1.39543 9.5 2.5V3M0.5 11.5H14.5M1.5 3.5H13.5C14.0523 3.5 14.5 3.94772 14.5 4.5V13.5C14.5 14.0523 14.0523 14.5 13.5 14.5H1.5C0.947716 14.5 0.5 14.0523 0.5 13.5V4.5C0.5 3.94772 0.947715 3.5 1.5 3.5Z"
                  stroke={isActive("/") ? "#004e99" : "currentColor"}
                />
              </svg>
              <span className="text-xs font-semibold">Jobs</span>
            </Link>
            <Link
              href="/in-work"
              className={`flex flex-col items-center p-1 transition-colors ${
                isActive("/in-work")
                  ? "text-[#004e99] border-b-2 border-[#004e99]"
                  : "text-[#414752] hover:bg-[#e9e8e7] rounded-lg"
              }`}
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
              href="/messaging"
              className={`flex flex-col items-center p-1 transition-colors ${
                isActive("/messaging")
                  ? "text-[#004e99] border-b-2 border-[#004e99]"
                  : "text-[#414752] hover:bg-[#e9e8e7] rounded-lg"
              }`}
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
            <button
              onClick={handleLogout}
              className="text-red-500 cursor-pointer hover:bg-red-50 p-1.5 rounded-full transition-colors shrink-0"
            >
              <svg
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 52 52"
              >
                <g>
                  <path
                    d="M21,48.5v-3c0-0.8-0.7-1.5-1.5-1.5h-10C8.7,44,8,43.3,8,42.5v-33C8,8.7,8.7,8,9.5,8h10
        C20.3,8,21,7.3,21,6.5v-3C21,2.7,20.3,2,19.5,2H6C3.8,2,2,3.8,2,6v40c0,2.2,1.8,4,4,4h13.5C20.3,50,21,49.3,21,48.5z"
                  />
                  <path
                    d="M49.6,27c0.6-0.6,0.6-1.5,0-2.1L36.1,11.4c-0.6-0.6-1.5-0.6-2.1,0l-2.1,2.1c-0.6,0.6-0.6,1.5,0,2.1l5.6,5.6
        c0.6,0.6,0.2,1.7-0.7,1.7H15.5c-0.8,0-1.5,0.6-1.5,1.4v3c0,0.8,0.7,1.6,1.5,1.6h21.2c0.9,0,1.3,1.1,0.7,1.7l-5.6,5.6
        c-0.6,0.6-0.6,1.5,0,2.1l2.1,2.1c0.6,0.6,1.5,0.6,2.1,0L49.6,27z"
                  />
                </g>
              </svg>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

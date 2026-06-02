"use client";

import Image from "next/image";
import Link from "next/link";
import { User } from "@/app/lib/hooks/user";
import Navbar from "@/app/components/navbar/Navbar";
import Footer from "@/app/components/footer/Footer";
import EducationCard from "@/app/components/educationCard/EducationCard";
import { Education, Experience } from "../lib/models/user.model";
import ExperienceCard from "@/app/components/experienceCard/ExperienceCard";
import { useState } from "react";
import CreateSkillModal, {
  CreateEducationModal,
  CreateExperienceModal,
} from "../components/modals/profileModals";

type ModalType = "skill" | "experience" | "education" | null;

export default function ProfilePage() {
  const { data: user } = User();
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const onClose = () => setOpenModal(null);
  const handleOpenSkill = () => setOpenModal("skill");
  const handleOpenExperience = () => setOpenModal("experience");
  const handleOpenEducation = () => setOpenModal("education");
  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2ef]">
      <Navbar user={user} />
      <main className="flex-1 pt-20 pb-6">
        <div className="max-w-282 mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 py-6 px-6 md:px-0">
          <div className="md:col-span-8 space-y-2">
            <section className="bg-white rounded-lg border border-[#c1c6d4] overflow-hidden">
              <div className="h-48 w-full bg-[#0a66c2] relative">
                <div className="absolute inset-0 bg-linear-to-br from-[#004e99] to-[#2f5ea1] opacity-80" />
              </div>
              <div className="px-6 pb-6 relative">
                <div className="absolute -top-16 left-6">
                  {user?.logoURL ? (
                    <Image
                      src={user.logoURL}
                      alt="Profile"
                      width={160}
                      height={160}
                      className="w-40 h-40 rounded-full border-4 border-white object-cover"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-full border-4 border-white bg-[#efeded] flex items-center justify-center">
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#414752"
                        strokeWidth="1.5"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="pt-24 flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold text-[#1b1c1c]">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email}
                    </h1>
                    <p className="text-xs text-[#414752] mt-1">
                      <span className="text-[#004e99] font-semibold">
                        500+ connections
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      href="/in-work"
                      className="bg-[#004e99] block text-white text-sm font-semibold px-6 py-2 rounded-full hover:bg-[#00468a] transition-colors"
                    >
                      Open to
                    </Link>
                    <Link
                      href="/in-work"
                      className="border block border-[#004e99] text-[#004e99] text-sm font-semibold px-6 py-2 rounded-full hover:bg-[#f5f3f3] transition-colors"
                    >
                      Add profile section
                    </Link>
                    <Link
                      href="/in-work"
                      className="border block border-[#727783] text-[#414752] text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#f5f3f3] transition-colors"
                    >
                      More
                    </Link>
                  </div>
                </div>
              </div>
            </section>
            <section className="bg-white rounded-lg border border-[#c1c6d4] p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">About</h2>
                <button className="text-[#414752] hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[#414752] leading-relaxed">
                {user?.description ??
                  "No about section yet. Add a description to tell people about yourself."}
              </p>
            </section>
            <section className="bg-white rounded-lg border border-[#c1c6d4] p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Experience</h2>
                <div className="flex gap-2">
                  <button onClick={handleOpenExperience} className="text-[#414752] hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <button className="text-[#414752] hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
              {user?.Experience && user.Experience.length > 0 ? (
                <div className="space-y-6">
                  {user.Experience.map((exp: Experience) => (
                    <ExperienceCard key={exp.id} experience={exp} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#414752]">
                  No experience added yet.
                </p>
              )}
            </section>
            <section className="bg-white rounded-lg border border-[#c1c6d4] p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Skills</h2>
                <div className="flex gap-2">
                  <button onClick={handleOpenSkill} className="text-[#414752] cursor-pointer hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <button className="text-[#414752] cursor-pointer hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
              {user?.skills && user.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-6 py-2 border border-[#c1c6d4] rounded-full text-sm font-semibold text-[#414752] hover:bg-[#0a66c2]/10 hover:text-[#0a66c2] cursor-pointer transition-all"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#414752]">No skills added yet.</p>
              )}
            </section>
            <section className="bg-white rounded-lg border border-[#c1c6d4] p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Education</h2>
                <div className="flex gap-2">
                  <button onClick={handleOpenEducation} className="text-[#414752] hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <button className="text-[#414752] hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
              {user?.education && user.education.length > 0 ? (
                <div className="space-y-6">
                  {user.education.map((edu: Education) => (
                    <EducationCard key={edu.id} education={edu} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#414752]">
                  No education added yet.
                </p>
              )}
            </section>
          </div>
          <aside className="md:col-span-4 space-y-2">
            <section className="bg-white rounded-lg border border-[#c1c6d4] p-4">
              <div className="flex justify-between items-center border-b border-[#c1c6d4] pb-4 mb-4">
                <h3 className="text-sm font-semibold">Profile Language</h3>
                <button className="text-[#414752] cursor-pointer hover:bg-[#f5f3f3] p-1.5 rounded-full transition-colors">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm">English</p>
            </section>
            <section className="bg-white rounded-lg border border-[#c1c6d4] p-6 text-center">
              <p className="text-xs font-semibold text-[#414752] uppercase tracking-wider mb-4">
                Ad
              </p>
              <div className="flex justify-center mb-4">
                {user?.logoURL ? (
                  <Image
                    src={user.logoURL}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#004e99] flex items-center justify-center border-2 border-white">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <rect x="2" y="7" width="20" height="14" rx="2" />
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-sm mb-4">
                {user?.firstName ? user.firstName : "Unlock"} your next
                opportunity with{" "}
                <span className="font-bold">CareerPath Premium</span>
              </p>
              <Link
                href="/in-work"
                className="w-full block border border-[#004e99] text-[#004e99] text-sm font-semibold py-2 rounded-full hover:bg-[#f5f3f3] transition-colors"
              >
                See who viewed your profile
              </Link>
            </section>
            <section className="bg-white rounded-lg border border-[#c1c6d4] p-6">
              <h3 className="text-sm font-semibold mb-4">People also viewed</h3>
              <div className="space-y-6">
                {[
                  {
                    name: "Sarah Jenkins",
                    role: "Principal Product Designer at DesignCore",
                  },
                  {
                    name: "David Chen",
                    role: "VP of Engineering at CloudScale",
                  },
                ].map((person) => (
                  <div key={person.name} className="flex gap-2">
                    <div className="w-12 h-12 rounded-full bg-[#efeded] flex items-center justify-center shrink-0">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#414752"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{person.name}</p>
                      <p className="text-xs text-[#414752] line-clamp-1">
                        {person.role}
                      </p>
                      <button className="mt-1 border cursor-pointer border-[#727783] text-[#414752] text-xs font-semibold px-4 py-1 rounded-full hover:bg-[#f5f3f3] flex items-center gap-1 transition-colors">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                          <line x1="20" y1="8" x2="20" y2="14" />
                          <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        Connect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
      {openModal === "skill" && <CreateSkillModal onClose={onClose} />}
      {openModal === "experience" && (
        <CreateExperienceModal onClose={onClose} />
      )}
      {openModal === "education" && <CreateEducationModal onClose={onClose} />}
    </div>
  );
}
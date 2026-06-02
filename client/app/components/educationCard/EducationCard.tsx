import { Education } from "@/app/lib/models/user.model";

export interface EducationCardProps {
  education: Education;
}

export default function EducationCard({ education }: EducationCardProps) {
  const startYear = new Date(education.start).getFullYear();
  const endYear = new Date(education.end).getFullYear();

  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 shrink-0 bg-[#efeded] rounded-lg flex items-center justify-center">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#414752"
          strokeWidth="1.5"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-semibold text-[#1b1c1c]">
          {education.title}
        </h3>
        <p className="text-sm text-[#1b1c1c]">{education.department}</p>
        <p className="text-xs text-[#414752] mt-1">
          {startYear} - {endYear}
        </p>
      </div>
    </div>
  );
}

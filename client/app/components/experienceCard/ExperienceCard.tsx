import { Experience } from "@/app/lib/models/user.model";

interface ExperienceCardProps {
  experience: Experience;
}

export default function ExperienceCard({ experience }: ExperienceCardProps) {
  const startDate = new Date(experience.start).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const endDate = new Date(experience.end).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 shrink-0 bg-[#efeded] rounded-lg flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#414752"
          strokeWidth="1.5"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </div>
      <div className="grow border-b border-[#c1c6d4] pb-4">
        <h3 className="text-base font-semibold text-[#1b1c1c]">
          {experience.title}
        </h3>
        <p className="text-xs text-[#414752] mt-1">
          {startDate} - {endDate}
        </p>
        {experience.location && (
          <p className="text-xs text-[#414752]">{experience.location}</p>
        )}
        {experience.description && (
          <p className="text-sm text-[#414752] mt-2 leading-relaxed">
            {experience.description}
          </p>
        )}
      </div>
    </div>
  );
}

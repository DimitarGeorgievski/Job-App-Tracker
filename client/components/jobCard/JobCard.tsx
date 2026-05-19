import { Job } from "@/app/lib/models/job.model";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface JobCardProps {
  job: Job;
  onToggle?: (job: Job) => void;
  isSaved: (id: number) => boolean;
}

export default function JobCard({ job, onToggle, isSaved }: JobCardProps) {
  const router = useRouter();
  return (
    <article className="bg-white border border-[#c1c6d4] rounded-lg p-4 hover:shadow-md transition-shadow group">
      <div className="flex gap-4">
        <div className="relative w-12 h-12 bg-[#efeded] rounded border border-[#c1c6d4] shrink-0 overflow-hidden flex items-center justify-center">
          {job.company.user.logoURL ? (
            <Image
              src={job.company.user.logoURL}
              fill
              sizes="48px"
              alt={`${job.company.companyName} logo`}
              className="object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-[#414752]">
              {job.company.companyName}
            </span>
          )}
        </div>
        <div className="grow">
          <h3 className="text-base font-semibold text-[#004e99] group-hover:underline">
            {job.title}
          </h3>
          <p className="text-sm text-[#1b1c1c]">{job.company.companyName}</p>
          <p className="text-xs text-[#414752]">{job.location ?? "Remote"}</p>
          <div className="mt-4 flex flex-wrap gap-1">
            <span className="bg-[#efeded] px-2 py-1 rounded-full text-xs font-semibold text-[#414752] flex items-center gap-1">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDistanceToNow(new Date(job.createdAt), {
                addSuffix: true,
              })}
            </span>
            <span className="bg-[#005287]/10 px-2 py-1 rounded-full text-xs font-semibold text-[#005287] flex items-center gap-1">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {job.jobType.replace("_", " ")}
            </span>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => {
                router.push(`apply-job/${job.id}`);
              }}
              className="bg-[#004e99] text-white cursor-pointer text-sm font-semibold px-6 py-2 rounded-full hover:bg-[#004e99]/90 transition-all flex items-center gap-1"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Apply
            </button>
            <button
              onClick={() => onToggle?.(job)}
              className="text-sm cursor-pointer font-semibold px-6 py-2 rounded-full transition-all border border-[#004e99] text-[#004e99] hover:bg-[#004e99]/5"
            >
              {isSaved(job.id) ? "Unsave" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

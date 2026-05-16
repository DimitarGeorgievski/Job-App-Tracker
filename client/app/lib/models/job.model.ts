import { Company } from "./company.model";

export type JobType = "REMOTE" | "ONSITE" | "HYBRID";

export interface Job {
  id: number;
  title: string;
  description: string;
  location?: string;
  jobType: JobType;
  createdAt: string;
  updatedAt: string;
  companyId: number;
  company: Company;
}

export interface JobStore {
  appliedJobs: Job[];
  addAppliedJob: (job: Job) => void;
  removeAppliedJob: (id: number) => void;
}

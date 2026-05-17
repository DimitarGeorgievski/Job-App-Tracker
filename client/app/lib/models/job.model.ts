import { Company } from "./company.model";

export enum JobType {
  REMOTE = "REMOTE",
  ONSITE = "ONSITE",
  HYBRID = "HYBRID",
}

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

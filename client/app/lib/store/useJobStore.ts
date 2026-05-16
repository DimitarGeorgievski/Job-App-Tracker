import { create } from "zustand";
import { JobStore } from "../models/job.model";

export const useJobStore = create<JobStore>((set) => ({
  appliedJobs: [],
  addAppliedJob: (job) =>
    set((state) => ({ appliedJobs: [...state.appliedJobs, job] })),
  removeAppliedJob: (id) =>
    set((state) => ({
      appliedJobs: state.appliedJobs.filter((j) => j.id !== id),
    })),
}))
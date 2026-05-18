import { create } from "zustand";
import { Job } from "../models/job.model";
import { persist } from "zustand/middleware";

interface JobStore {
  savedJobs: Job[];
  toggleSavedJob: (job: Job) => void;
  isSaved: (id: number) => boolean;
}

export const useJobStore = create<JobStore>()(
  persist(
    (set, get) => ({
      savedJobs: [],
      toggleSavedJob: (job) =>
        set((state) => {
          const exists = state.savedJobs.some((j) => j.id === job.id);
          return {
            savedJobs: exists
              ? state.savedJobs.filter((j) => j.id !== job.id)
              : [...state.savedJobs, job],
          };
        }),
      isSaved: (id: number) => get().savedJobs.some((j) => j.id === id),
    }),
    {
      name: "applied-jobs",
    },
  ),
);

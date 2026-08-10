import { useQuery } from "@tanstack/react-query"
import { api } from "../axios"
import { Job, JobType } from "../models/job.model"

interface JobsParams {
  page: number
  jobType?: JobType | string
  date: string
  query?: string
  location?: string
}

async function fetchJobs(params: JobsParams) {
  const parametars = {
    ...params,
    jobType: params.jobType || undefined,
    query: params.query || undefined,
    location: params.location || undefined,
    date: params.date === null ? undefined : params.date
  }
  const { data } = await api.get("/jobs", { params: parametars })
  return data as { jobs: Job[]; total: number; totalPages: number }
}

export function useJobs(params: JobsParams) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () => fetchJobs(params),
  })
}
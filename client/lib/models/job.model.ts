export interface Job {
  id: number
  title: string
  company: string
}

export interface JobStore {
  appliedJobs: Job[]
  addAppliedJob: (job: Job) => void
  removeAppliedJob: (id: number) => void
}
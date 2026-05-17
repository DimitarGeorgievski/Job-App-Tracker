export interface Company {
  id: number
  companyName: string
  website?: string
  description: string
  location: string
  industry: string
  userId: number
  createdAt: string
  user: {
    logoURL?: string | null
  }
}
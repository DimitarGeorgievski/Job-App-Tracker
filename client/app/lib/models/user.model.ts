export interface user {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  logoURL: string;
  description: string;
  experience: string[];
  skills: string[]
  education: Education[]
  Experience: Experience[]
  role: userRole;
}

export enum userRole{
    USER = "USER",
    COMPANY = "COMPANY",
    ADMIN = "ADMIN"
}

export interface Education {
  id: number;
  start: Date;
  end: Date;
  title: string;
  department: string;
}

export interface Experience {
  id: number;
  start: Date;
  end: Date;
  title: string;
  description: string;
  location: string;
  companyId: number;
}
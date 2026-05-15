export interface user {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: userRole;
}

export enum userRole{
    USER = "USER",
    COMPANY = "COMPANY",
    ADMIN = "ADMIN"
}
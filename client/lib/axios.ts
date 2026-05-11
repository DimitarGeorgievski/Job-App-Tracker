import axios from "axios"

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/app`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})
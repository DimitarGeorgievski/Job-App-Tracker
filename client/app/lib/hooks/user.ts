import { useQuery } from "@tanstack/react-query";
import { user } from "../models/user.model";

export function User() {
  return useQuery<user | null>({
    queryKey: ["user"],
    queryFn: () => Promise.resolve(null),
    enabled: false,
  })
}
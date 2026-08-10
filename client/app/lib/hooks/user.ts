import { useQuery } from "@tanstack/react-query";
import { user } from "../models/user.model";
import { api } from "../axios";

export function User() {
  return useQuery<user | null>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await api.get("/user/me");
      return data;
    },
    retry: false,
  });
}

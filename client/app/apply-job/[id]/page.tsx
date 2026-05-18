import { api } from "@/app/lib/axios";
import { User } from "@/app/lib/hooks/user";
import { applySchema } from "@/app/lib/schemas/applyJob.schema";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type Step = 1 | 2 | 3;

export default function ApplyJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: user } = User();
  const [step, setStep] = useState<Step>(1);
  const [serverError, setServerError] = useState("");
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get(`/jobs/${id}`),
  });
  const form = useForm({
    defaultValues: {
      firstName: user?.firstName,
      lastName: user?.lastName ,
      email: user?.email,
      phone: "",
      coverLetter: "",
      terms: false,
    },
    validators: { onChange: applySchema },
    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        await api.post("/applications", {
            id: Number(id),
        }, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setStep(3);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setServerError(error.response?.data?.message || "Something went wrong");
        }
      }
    },
  });
  
}

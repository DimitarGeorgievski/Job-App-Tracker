import z from "zod";
import { isValidPhoneNumber, parsePhoneNumberWithError } from "libphonenumber-js";

export const stepOneApplySchema = z.object({
  notes: z.string().min(1, "notes are required").max(200, "Max characters are 200."),
  phone: z.string().refine(isValidPhoneNumber, "Please specify a valid phone number (include the international prefix).")
        .transform((value) => parsePhoneNumberWithError(value).number.toString()),
});
export const stepTwoApplySchema = z
  .object({
    coverLetter: z.string(),
    file: z.instanceof(File).nullable(),
    terms: z.boolean().refine((v) => v, {
      message: "You must accept the terms",
    }),
  })
  .refine(
    (data) => {
      return (
        data.coverLetter.trim().length > 0 ||
        data.file !== null
      );
    },
    {
      message: "Provide a cover letter or upload a file",
      path: ["coverLetter"],
    }
  )
  .refine(
    (data) => {
      if (!data.file) return true;
      return data.file.size <= 5 * 1024 * 1024;
    },
    {
      message: "Max file size is 5MB",
      path: ["file"],
    }
  );
export type StepOneApplySchema = z.infer<typeof stepOneApplySchema>
export type StepTwoApplySchema = z.infer<typeof stepTwoApplySchema>
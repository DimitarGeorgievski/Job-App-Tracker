import z from "zod";
import { isValidPhoneNumber, parsePhoneNumberWithError } from "libphonenumber-js";

export const applySchema = z.object({
  notes: z.string().min(1, "String is required").max(200, "max characters are 200."),
  phone: z.string().refine(isValidPhoneNumber, "Please specify a valid phone number (include the international prefix).")
        .transform((value) => parsePhoneNumberWithError(value).number.toString()),
  coverLetter: z.string(),
  terms: z
    .boolean()
    .refine((v) => v === true, "You must agree to the terms"),
});
export type ApplySchema = z.infer<typeof applySchema>
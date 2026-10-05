import { z } from "zod";

// Mirror Better Auth's server rules so the form can show errors before submitting.
export const signUpInputSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(50),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "At least 8 characters").max(128),
});

export const logInInputSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

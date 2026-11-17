"use client";

import { signUpInputSchema } from "@fitness/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard.jsx";
import { FormField } from "@/components/FormField.jsx";
import { PasswordField } from "@/components/PasswordField.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuth } from "@/lib/auth.jsx";
import { useForm } from "@/lib/use-form.js";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const form = useForm({
    schema: signUpInputSchema,
    initialValues: { name: "", email: "", password: "" },
    onSubmit: async (values) => {
      // Sign-up also logs in: the api sets the token cookies.
      await signUp(values);
      router.replace("/");
    },
  });

  return (
    <AuthCard
      title="Create account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit} noValidate className="grid gap-4">
        <FormField
          id="name"
          label="Name"
          autoComplete="name"
          error={form.errors.name}
          {...form.field("name")}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={form.errors.email}
          {...form.field("email")}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          error={form.errors.password}
          {...form.field("password")}
        />
        {form.formError && (
          <p role="alert" className="text-sm text-destructive">
            {form.formError}
          </p>
        )}
        <Button type="submit" className="h-11 text-base" disabled={form.isSubmitting}>
          {form.isSubmitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </AuthCard>
  );
}

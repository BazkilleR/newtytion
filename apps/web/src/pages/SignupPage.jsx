import { signUpInputSchema } from "@fitness/shared";
import { Link, useNavigate } from "react-router";
import { AuthCard } from "@/components/auth/AuthCard.jsx";
import { FormField } from "@/components/FormField.jsx";
import { Button } from "@/components/ui/button.jsx";
import { signUp } from "@/lib/auth-client.js";
import { useForm } from "@/lib/use-form.js";

export function SignupPage() {
  const navigate = useNavigate();

  const form = useForm({
    schema: signUpInputSchema,
    initialValues: { name: "", email: "", password: "" },
    onSubmit: async (values) => {
      // autoSignIn is on, so a successful sign-up also sets the session cookie.
      const { error } = await signUp.email(values);
      if (error) throw new Error(error.message ?? "Could not sign up");
      navigate("/", { replace: true });
    },
  });

  return (
    <AuthCard
      title="Create account"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-foreground underline">
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
        <FormField
          id="password"
          label="Password"
          type="password"
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

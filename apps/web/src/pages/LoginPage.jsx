import { logInInputSchema } from "@fitness/shared";
import { Link, useLocation, useNavigate } from "react-router";
import { AuthCard } from "@/components/auth/AuthCard.jsx";
import { FormField } from "@/components/FormField.jsx";
import { PasswordField } from "@/components/PasswordField.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuth } from "@/lib/auth.jsx";
import { useForm } from "@/lib/use-form.js";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logIn } = useAuth();

  const form = useForm({
    schema: logInInputSchema,
    initialValues: { email: "", password: "" },
    onSubmit: async (values) => {
      await logIn(values);
      navigate(location.state?.from ?? "/", { replace: true });
    },
  });

  return (
    <AuthCard
      title="Log in"
      footer={
        <>
          No account?{" "}
          <Link to="/signup" className="text-foreground underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit} noValidate className="grid gap-4">
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
          autoComplete="current-password"
          error={form.errors.password}
          {...form.field("password")}
        />
        {form.formError && (
          <p role="alert" className="text-sm text-destructive">
            {form.formError}
          </p>
        )}
        <Button type="submit" className="h-11 text-base" disabled={form.isSubmitting}>
          {form.isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthCard>
  );
}

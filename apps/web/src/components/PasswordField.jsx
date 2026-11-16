import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/components/FormField.jsx";

/** FormField for passwords with a show/hide toggle. */
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      action={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Icon className="size-5" />
        </button>
      }
    />
  );
}

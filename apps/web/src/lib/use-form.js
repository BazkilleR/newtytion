import { useState } from "react";

/** Zod error -> { fieldName: "first message" } */
export function fieldErrorsFrom(zodError) {
  const errors = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Minimal form state: controlled values, per-field errors from a Zod schema,
 * and a submit handler that only runs `onSubmit` with parsed, valid data.
 * If `onSubmit` throws, the message is shown as `formError`.
 */
export function useForm({ schema, initialValues, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setValue(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }

  /** Spread onto an <input>: value, onChange, name, aria-invalid */
  function field(name) {
    return {
      name,
      value: values[name] ?? "",
      onChange: (e) => setValue(name, e.target.value),
      "aria-invalid": errors[name] ? true : undefined,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(fieldErrorsFrom(result.error));
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(result.data);
    } catch (err) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, errors, formError, isSubmitting, field, setValue, handleSubmit };
}

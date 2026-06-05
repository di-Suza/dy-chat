import { ArrowRight, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthShell } from "../../components/AuthShell.jsx";
import { AuthSubmitButton } from "../../components/AuthSubmitButton.jsx";
import { AuthTextField } from "../../components/AuthTextField.jsx";
import { PasswordField } from "../../components/PasswordField.jsx";
import { useLoginPage } from "./useLoginPage.js";

export const LoginPage = () => {
  const { errorMessage, form, isLoading, onSubmit } = useLoginPage();
  const {
    formState: { errors },
    register
  } = form;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your conversations."
      footer={
        <p className="auth-switch">
          No account? <Link to="/register">Register</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthTextField
          autoComplete="email"
          error={errors.email?.message}
          icon={Mail}
          label="Email"
          placeholder="you@example.com"
          type="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: "Enter a valid email"
            }
          })}
        />

        <PasswordField
          autoComplete="current-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Enter password"
          {...register("password", {
            required: "Password is required"
          })}
        />

        {errorMessage ? (
          <div className="auth-alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <AuthSubmitButton icon={ArrowRight} isLoading={isLoading}>
          Login
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
};


import { ArrowRight, Mail, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthShell } from "../../components/AuthShell.jsx";
import { AuthSubmitButton } from "../../components/AuthSubmitButton.jsx";
import { AuthTextField } from "../../components/AuthTextField.jsx";
import { PasswordField } from "../../components/PasswordField.jsx";
import { useRegisterPage } from "./useRegisterPage.js";

export const RegisterPage = () => {
  const { errorMessage, form, isLoading, onSubmit } = useRegisterPage();
  const {
    formState: { errors },
    register
  } = form;

  return (
    <AuthShell
      title="Create account"
      subtitle="Start with your name, email, and password."
      footer={
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthTextField
          autoComplete="name"
          error={errors.name?.message}
          icon={UserRound}
          label="Name"
          placeholder="Your name"
          type="text"
          {...register("name", {
            required: "Name is required",
            minLength: {
              value: 2,
              message: "Name must be at least 2 characters"
            }
          })}
        />

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
          autoComplete="new-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Create password"
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 6,
              message: "Password must be at least 6 characters"
            }
          })}
        />

        {errorMessage ? (
          <div className="auth-alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <AuthSubmitButton icon={ArrowRight} isLoading={isLoading}>
          Register
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
};


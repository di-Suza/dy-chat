import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export const PasswordField = forwardRef(({ error, label, ...inputProps }, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <span className={`auth-input-wrap ${error ? "auth-input-wrap-error" : ""}`}>
        <Lock size={18} strokeWidth={2.1} />
        <input ref={ref} type={isVisible ? "text" : "password"} {...inputProps} />
        <button
          className="auth-password-toggle"
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {error ? <span className="auth-field-error">{error}</span> : null}
    </label>
  );
});

PasswordField.displayName = "PasswordField";


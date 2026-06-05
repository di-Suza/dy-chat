import { forwardRef } from "react";

export const AuthTextField = forwardRef(
  ({ error, icon: Icon, label, ...inputProps }, ref) => {
    return (
      <label className="auth-field">
        <span className="auth-label">{label}</span>
        <span className={`auth-input-wrap ${error ? "auth-input-wrap-error" : ""}`}>
          {Icon ? <Icon size={18} strokeWidth={2.1} /> : null}
          <input ref={ref} {...inputProps} />
        </span>
        {error ? <span className="auth-field-error">{error}</span> : null}
      </label>
    );
  }
);

AuthTextField.displayName = "AuthTextField";


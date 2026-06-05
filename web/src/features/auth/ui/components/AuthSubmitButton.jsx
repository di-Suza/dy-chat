export const AuthSubmitButton = ({ children, icon: Icon, isLoading }) => {
  return (
    <button className="auth-submit" type="submit" disabled={isLoading}>
      <span>{isLoading ? "Please wait" : children}</span>
      {Icon ? <Icon size={18} strokeWidth={2.2} /> : null}
    </button>
  );
};


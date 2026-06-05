import { MessageCircle, ShieldCheck, UsersRound } from "lucide-react";

import "./auth.css";

export const AuthShell = ({ children, footer, subtitle, title }) => {
  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="DyChat">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <MessageCircle size={22} strokeWidth={2.2} />
          </span>
          <span>DyChat</span>
        </div>

        <div className="auth-visual-copy">
          <p className="auth-kicker">Real-time conversations</p>
          <h1>Message cleanly, privately, and instantly.</h1>
        </div>

        <div className="auth-message-stack" aria-hidden="true">
          <div className="auth-message-tile auth-message-tile-left">
            <MessageCircle size={18} />
            <span>Direct chat ready</span>
          </div>
          <div className="auth-message-tile auth-message-tile-right">
            <UsersRound size={18} />
            <span>Groups next</span>
          </div>
          <div className="auth-message-tile auth-message-tile-left">
            <ShieldCheck size={18} />
            <span>Token auth flow</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
          {footer}
        </div>
      </section>
    </main>
  );
};


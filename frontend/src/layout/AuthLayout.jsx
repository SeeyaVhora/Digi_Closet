import { Outlet } from 'react-router-dom';

// Public pages (landing, sign in, register) each bring their own chrome.
export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
}

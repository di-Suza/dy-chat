import { createBrowserRouter, Navigate } from "react-router-dom";

import { LoginPage } from "../../features/auth/ui/pages/LoginPage/LoginPage.jsx";
import { RegisterPage } from "../../features/auth/ui/pages/RegisterPage/RegisterPage.jsx";
import { PrivateLayout } from "../layouts/PrivateLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { PrivateHomePage } from "../pages/PrivateHomePage.jsx";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/login" replace />
      },
      {
        path: "/login",
        element: <LoginPage />
      },
      {
        path: "/register",
        element: <RegisterPage />
      }
    ]
  },
  {
    element: <PrivateLayout />,
    children: [
      {
        path: "/app",
        element: <PrivateHomePage />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />
  }
]);


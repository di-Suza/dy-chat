import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";

import { ErrorBoundary } from "./error/ErrorBoundary.jsx";
import { AuthInitializer } from "./initializers/AuthInitializer.jsx";
import { router } from "./routes/router.jsx";
import { store } from "./store/store.js";
import "./app.css";

export const App = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthInitializer>
          <RouterProvider router={router} />
        </AuthInitializer>
      </Provider>
    </ErrorBoundary>
  );
};

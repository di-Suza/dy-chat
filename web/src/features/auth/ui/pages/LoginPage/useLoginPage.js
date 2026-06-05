import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";

import { useLoginMutation } from "../../../api/authApi.js";
import { getAuthErrorMessage } from "../../../lib/getAuthErrorMessage.js";

export const useLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { error, isLoading }] = useLoginMutation();

  const form = useForm({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values).unwrap();

      const from = location.state?.from;
      const redirectTo = from ? `${from.pathname}${from.search ?? ""}` : "/app";

      navigate(redirectTo, { replace: true });
    } catch (_error) {
      // RTK Query exposes the renderable error state from the mutation result.
    }
  });

  return {
    errorMessage: getAuthErrorMessage(error),
    form,
    isLoading,
    onSubmit
  };
};


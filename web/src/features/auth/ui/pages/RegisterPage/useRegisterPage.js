import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useRegisterMutation } from "../../../api/authApi.js";
import { getAuthErrorMessage } from "../../../lib/getAuthErrorMessage.js";

export const useRegisterPage = () => {
  const navigate = useNavigate();
  const [registerUser, { error, isLoading }] = useRegisterMutation();

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await registerUser(values).unwrap();
      navigate("/app", { replace: true });
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


export const getAuthErrorMessage = (error) => {
  if (!error) {
    return "";
  }

  const data = error.data;

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  if (error.status === "FETCH_ERROR") {
    return "Could not connect to the server.";
  }

  return "Something went wrong. Please try again.";
};


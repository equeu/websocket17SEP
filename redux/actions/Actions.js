// store/actions.js

export const setAuthToken = (token) => ({
  type: "SET_AUTH_TOKEN",
  payload: token,
});

export const clearAuthToken = () => ({
  type: "CLEAR_AUTH_TOKEN",
});

// store/reducers.js

const initialState = {
  authToken: null,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case "SET_AUTH_TOKEN":
      return { ...state, authToken: action.payload };
    case "CLEAR_AUTH_TOKEN":
      return { ...state, authToken: null };
    default:
      return state;
  }
};

export default rootReducer;

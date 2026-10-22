import { createSlice } from '@reduxjs/toolkit';

const KEY = 'attendflow.token';

const readToken = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const writeToken = (token) => {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
};

const token = readToken();

const authSlice = createSlice({
  name: 'auth',
  // `ready` is false while a stored token is being validated against the server.
  initialState: { token, user: null, ready: !token },
  reducers: {
    setCredentials(state, { payload }) {
      state.token = payload.token;
      state.user = payload.user;
      state.ready = true;
      writeToken(payload.token);
    },
    setUser(state, { payload }) {
      state.user = payload;
      state.ready = true;
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.ready = true;
      writeToken(null);
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectToken = (s) => s.auth.token;
export const selectUser = (s) => s.auth.user;
export const selectAuthReady = (s) => s.auth.ready;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../services/api';

const loadInitialState = () => {
  const access = localStorage.getItem('accessToken');
  const refresh = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (_) {}
  return { access, refresh, user };
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const data = await api.login(username, password);
      return data;
    } catch (err) {
      if (err?.error === 'email_not_verified') {
        return rejectWithValue(err);
      }
      return rejectWithValue(err.detail || err.non_field_errors || err);
    }
  }
);

export const loginWithGoogle = createAsyncThunk(
  'auth/loginGoogle',
  async (idToken, { rejectWithValue }) => {
    try {
      return await api.googleLogin(idToken);
    } catch (err) {
      return rejectWithValue(err.error || err.detail || err);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await api.register(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getMe();
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

const initialState = {
  ...loadInitialState(),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.access = null;
      state.refresh = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    setCredentials(state, action) {
      const { access, refresh, user } = action.payload;
      state.access = access;
      state.refresh = refresh;
      state.user = user;
      state.isAuthenticated = !!access;
      if (access) localStorage.setItem('accessToken', access);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      if (user) localStorage.setItem('user', JSON.stringify(user));
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.access = action.payload.access;
        state.refresh = action.payload.refresh;
        state.user = action.payload.user ?? null;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.access);
        localStorage.setItem('refreshToken', action.payload.refresh);
        if (action.payload.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.user));
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Google login (same token storage as password login)
      .addCase(loginWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.access = action.payload.access;
        state.refresh = action.payload.refresh;
        state.user = action.payload.user ?? null;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.access);
        localStorage.setItem('refreshToken', action.payload.refresh);
        if (action.payload.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.user));
        }
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchUser
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(fetchUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.access = null;
        state.refresh = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      });
  },
});

export const { logout, setCredentials, clearError } = authSlice.actions;
export default authSlice.reducer;

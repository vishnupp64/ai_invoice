import axios from "axios";
import toast from "react-hot-toast";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

type GlobalLogoutFn = () => void;
let globalLogout: GlobalLogoutFn | null = null;

export function registerGlobalLogout(fn: GlobalLogoutFn) {
  globalLogout = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const pathname = window.location.pathname;
    const isAuthPage = pathname === "/login" || pathname === "/register";
    if (status === 401) {
      const STORAGE_KEY = "ai_invoice_token";
      localStorage.removeItem(STORAGE_KEY);
      setAuthToken(null);
      if (globalLogout) {
        globalLogout();
      }
      if (!isAuthPage) {
        const msg = err?.response?.data?.message ?? "Session expired. Please sign in again.";
        toast.error(msg);
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    }
    return Promise.reject(err);
  }
);


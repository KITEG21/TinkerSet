const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export const BACKEND_URL = import.meta.env.VITE_API_URL ?? DEFAULT_BACKEND_URL;
import axios from "axios";

const API = axios.create({
    baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
});

// Request interceptor: Attach token
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.token = token; // Matches your backend checking for "token" header
        config.headers.Authorization = `Bearer ${token}`; // Standard practice fallback
    }
    return config;
});

// 🌟 NEW: Response interceptor to catch authentication failures globally
API.interceptors.response.use(
    (response) => {
        return response; // If the request succeeds, pass the response through smoothly
    },
    (error) => {
        // Check if the server responded with a 401 (Unauthorized) or 403 (Forbidden)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn("Session expired or unauthorized. Logging out...");
            
            // Clear credentials so the application state updates
            localStorage.removeItem("token");
            localStorage.removeItem("authUser");
            
            // Redirect smoothly to login page
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default API;
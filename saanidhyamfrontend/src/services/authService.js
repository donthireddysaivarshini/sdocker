// Updated to check LocalStorage accurately

const authService = {
  // Check if token exists
  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    return !!token; // Returns true if token exists, false if null/empty
  },

  // Get the token string
  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },

  // This seems to be a placeholder for direct login, 
  // but since you use AuthContext for login, we can keep this simple 
  // or redirect to the actual login function if needed.
  login: async (credentials) => {
     console.warn("Please use useAuth() context for login instead of this direct service.");
     return { success: false, message: "Use AuthContext" };
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

export default authService;
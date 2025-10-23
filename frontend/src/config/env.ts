export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  useMockData: import.meta.env.VITE_MOCK_DATA === "true",
};

// Utility functions for authentication
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    const currentTime = Date.now() / 1000
    return payload.exp < currentTime
  } catch (error) {
    return true // If we can't parse the token, consider it expired
  }
}

export const getTokenPayload = (token: string) => {
  try {
    return JSON.parse(atob(token.split(".")[1]))
  } catch (error) {
    return null
  }
}

export const clearAuthData = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

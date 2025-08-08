"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiService } from "@/lib/api-service"

type User = {
  id: number
  name: string
  email: string
  role: string
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_TOKEN_KEY = "auth_token"
const AUTH_USER_KEY = "auth_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load token and user from localStorage on mount
  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null
    const storedUser = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_KEY) : null
    if (storedToken) {
      setToken(storedToken)
      apiService.setAuthToken(storedToken)
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        setIsLoading(false)
      } catch {
        setUser(null)
        setIsLoading(false)
      }
    } else if (storedToken) {
      // Fetch profile only once if user not in cache
      fetchProfile(storedToken)
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line
  }, [])

  const fetchProfile = useCallback(async (tokenToUse: string) => {
    setIsLoading(true)
    try {
      apiService.setAuthToken(tokenToUse)
      const response = await apiService.get("/admins/profile")
      const adminProfile = response.data
      if (adminProfile) {
        const fullName = `${adminProfile.adminFirstName || ""} ${adminProfile.adminLastName || ""}`.trim()
        const loadedUser: User = {
          id: adminProfile.adminId,
          name: fullName || adminProfile.adminEmail,
          email: adminProfile.adminEmail,
          role: adminProfile.adminRole || "admin",
        }
        setUser(loadedUser)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(loadedUser))
      }
    } catch {
      setUser(null)
      localStorage.removeItem(AUTH_USER_KEY)
      localStorage.removeItem(AUTH_TOKEN_KEY)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update login to perform the API call and store token
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Use correct field names for API
      const response = await apiService.postFormData("/admins/sign-in", {
        email,
        password,
      })
      console.log("API login response:", response)
      if (!response.data) throw new Error("No data received from API")
      // Extract token from correct field
      const token = response.data // fallback for your API
      if (!token) throw new Error("No token received from API")
      setToken(token)
      apiService.setAuthToken(token)
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      await fetchProfile(token)
    } catch (err: any) {
      setUser(null)
      setToken(null)
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fetchProfile])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    apiService.setAuthToken(null)
  }, [])

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser))
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}

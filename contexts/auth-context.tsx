"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiService } from "@/lib/api-service"
import { isTokenExpired, clearAuthData } from "@/lib/auth-utils"

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (token && savedUser) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        clearAuthData()
        setIsLoading(false)
        return
      }

      try {
        apiService.setAuthToken(token)
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error("Error parsing saved user data:", error)
        clearAuthData()
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login with:", { email, endpoint: "https://cook-craft.dhcb.io/api/admins/sign-in" })

      const response = await fetch("https://cook-craft.dhcb.io/api/admins/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          email: email,
          password: password,
        }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      // Get response text first to see what we're actually receiving
      const responseText = await response.text()
      console.log("Raw response:", responseText)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (parseError) {
          // If response isn't JSON, use the raw text or status
          errorMessage = responseText || errorMessage
        }

        throw new Error(errorMessage)
      }

      // Try to parse the response as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError)
        throw new Error("Invalid response format from server")
      }

      console.log("Parsed response data:", data)

      // Handle the specific response structure where token is directly in data field
      let token, adminData

      // Check if data field contains the token directly as a string
      if (typeof data.data === "string" && data.data.includes("|")) {
        // This looks like a Laravel Sanctum token
        token = data.data
        adminData = null // No admin data provided in this format
      } else if (data.token) {
        token = data.token
        adminData = data.admin || data.user || data.data
      } else if (data.access_token) {
        token = data.access_token
        adminData = data.admin || data.user || data.data
      } else if (data.data && typeof data.data === "object" && data.data.token) {
        token = data.data.token
        adminData = data.data.admin || data.data.user || data.data
      } else {
        console.error("No token found in response:", data)
        throw new Error("No authentication token received from server")
      }

      if (!token) {
        throw new Error("Authentication token not found in response")
      }

      console.log("Login successful, token received:", token.substring(0, 10) + "...")

      localStorage.setItem("token", token)
      apiService.setAuthToken(token)

      // Create user object with fallbacks
      const userData = {
        id: adminData?.id || 1,
        name: adminData?.name || adminData?.first_name || "Admin User",
        email: adminData?.email || email,
        role: "admin",
      }

      localStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)
    } catch (error) {
      console.error("Login error details:", error)
      clearAuthData()

      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to the server. Please check your internet connection.")
      } else if (error instanceof Error) {
        throw error
      } else {
        throw new Error("An unexpected error occurred during login")
      }
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
    }
  }

  const logout = () => {
    clearAuthData()
    apiService.setAuthToken(null)
    setUser(null)
    // Redirect to login page
    window.location.href = "/login"
  }

  return <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

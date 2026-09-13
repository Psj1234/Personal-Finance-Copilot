/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getMe, loginUser, registerUser, setAuthToken, getAuthToken, onUnauthorized } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken())
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(getAuthToken()))
  const [authError, setAuthError] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const logout = useCallback((options = {}) => {
    setAuthToken(null)
    setToken(null)
    setUser(null)
    setAuthError(null)
    if (options.expired) {
      setSessionExpired(true)
    } else {
      setSessionExpired(false)
    }
  }, [])

  // Subscribe to 401 unauthorized notifications from api.js
  useEffect(() => {
    onUnauthorized(() => {
      logout({ expired: true })
    })
  }, [logout])

  // Initial session hydration
  useEffect(() => {
    const savedToken = getAuthToken()
    if (!savedToken) {
      return
    }

    let isMounted = true

    getMe()
      .then((data) => {
        if (isMounted) {
          setUser(data.user)
          setToken(savedToken)
          setSessionExpired(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthToken(null)
          setToken(null)
          setUser(null)
          setSessionExpired(true)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (email, password) => {
    setAuthError(null)
    setSessionExpired(false)
    try {
      const data = await loginUser({ email, password })
      setAuthToken(data.token)
      setToken(data.token)
      setUser(data.user)
      return data.user
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }

  const register = async (name, email, password) => {
    setAuthError(null)
    setSessionExpired(false)
    try {
      const data = await registerUser({ name, email, password })
      setAuthToken(data.token)
      setToken(data.token)
      setUser(data.user)
      return data.user
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }

  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false)
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    authError,
    sessionExpired,
    login,
    register,
    logout,
    clearAuthError,
    clearSessionExpired,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

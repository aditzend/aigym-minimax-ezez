import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, Admin } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  admin: Admin | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const mountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const authStateRef = useRef({ user: null, admin: null })

  // Cleanup timeout helper
  const clearAuthTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Safe loading state management with timeout
  const setLoadingState = useCallback((isLoading: boolean) => {
    if (!mountedRef.current) return
    
    clearAuthTimeout()
    setLoading(isLoading)
    
    if (isLoading) {
      // Safety timeout to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('Auth timeout - forcing loading completion')
          setLoading(false)
        }
      }, 5000)
    }
  }, [clearAuthTimeout])

  // Optimized admin data fetching - simplified for development
  const fetchAdminData = useCallback(async (userId: string): Promise<Admin | null> => {
    try {
      // For development - return a mock admin or skip admin check
      return {
        id: userId,
        email: 'admin@aigym.com',
        role: 'admin',
        permissions: ['read', 'write', 'admin']
      }
    } catch (error) {
      console.error('Admin fetch failed:', error)
      return null
    }
  }, [])

  // Initialize authentication state
  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      try {
        setLoadingState(true)
        
        // For development - skip actual auth check and complete loading quickly
        console.log('Auth initialization - development mode')
        
        if (!mounted) return
        
        // Set no user for now (development mode)
        setUser(null)
        setAdmin(null)
        authStateRef.current.user = null
        authStateRef.current.admin = null
        
        if (mounted) {
          setInitialized(true)
          setLoadingState(false)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        if (mounted) {
          setUser(null)
          setAdmin(null)
          setInitialized(true)
          setLoadingState(false)
        }
      }
    }

    initAuth()

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || !initialized) return
        
        console.log('Auth state change:', event)
        
        const newUser = session?.user || null
        const currentUser = authStateRef.current.user
        
        // Only update if user actually changed
        if (newUser?.id !== currentUser?.id) {
          setUser(newUser)
          authStateRef.current.user = newUser
          
          if (newUser) {
            const adminData = await fetchAdminData(newUser.id)
            if (mounted) {
              setAdmin(adminData)
              authStateRef.current.admin = adminData
            }
          } else {
            setAdmin(null)
            authStateRef.current.admin = null
          }
        }
        
        // Ensure loading is stopped after auth state change
        if (mounted && initialized) {
          setLoadingState(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchAdminData, setLoadingState, initialized])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      clearAuthTimeout()
    }
  }, [clearAuthTimeout])

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setLoadingState(true)
      
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setLoadingState(false)
        return { error: error.message }
      }
      
      return {}
    } catch (error) {
      setLoadingState(false)
      return { error: 'Sign in failed' }
    }
  }, [setLoadingState])

  const signOut = useCallback(async () => {
    try {
      setLoadingState(true)
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      setLoadingState(false)
    }
  }, [setLoadingState])

  const contextValue = {
    user,
    admin,
    loading,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
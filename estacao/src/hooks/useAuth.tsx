// hooks/useAuth.ts
import { useQuery } from '@tanstack/react-query'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth() {
  const setUser = useAuthStore(state => state.setUser)
  const router = useRouter()

  const query = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data } = await authService().getUser()
      setUser(data) // Assume que o usuário é o primeiro item do array
      return data
    },
    retry: 1,
    staleTime: 60 * 60 * 1000,
  })

  // Redireciona para login se houver erro
  useEffect(() => {
    if (query.isError) {
      setUser(null)
      router.push('/login')
    }
  }, [query.isError, setUser, router])

  return {
    user: query.data,
    role: query.data?.role,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}


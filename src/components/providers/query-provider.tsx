'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos sem re-buscar automaticamente
            gcTime: 1000 * 60 * 30, // 30 minutos em cache na memória
            refetchOnWindowFocus: false, // Não refaz busca ao alternar abas/apps no celular
            refetchOnReconnect: true, // Refaz se a internet cair e voltar
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

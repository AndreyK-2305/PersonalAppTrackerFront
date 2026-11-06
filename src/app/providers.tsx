import { QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createQueryClient } from "./query-client"

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}

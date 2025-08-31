"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { accountsClient } from "@/lib/accounts-client"
import type { CreateAccountData } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsClient.listAccounts(),
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateAccountData) => accountsClient.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast({
        title: "Account created",
        description: "Your new account has been added successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      })
    },
  })
}

export function useSetBalance() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ accountId, balanceMinor }: { accountId: string; balanceMinor: number }) =>
      accountsClient.setBalance(accountId, balanceMinor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast({
        title: "Balance updated",
        description: "Account balance has been updated successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update balance. Please try again.",
        variant: "destructive",
      })
    },
  })
}

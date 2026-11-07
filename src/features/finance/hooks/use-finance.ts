import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  archiveAccount,
  archiveCategory,
  createAccount,
  createCategory,
  deleteAccount,
  deleteCategory,
  deleteTransaction,
  financeKeys,
  reactivateAccount,
  reactivateCategory,
  recordTransaction,
  renameCategory,
  setUpFinance,
  updateAccount,
  updateTransaction,
} from "../api/finance"

/**
 * Mutación de finanzas. Cualquier cambio puede afectar saldos, listados y resúmenes, así que al
 * terminar se invalidan todas las consultas de finanzas.
 */
function useFinanceMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  })
}

export const useSetUpFinance = () => useFinanceMutation(setUpFinance)

export const useCreateAccount = () => useFinanceMutation(createAccount)
export const useUpdateAccount = () => useFinanceMutation(updateAccount)
export const useArchiveAccount = () => useFinanceMutation(archiveAccount)
export const useReactivateAccount = () => useFinanceMutation(reactivateAccount)
export const useDeleteAccount = () => useFinanceMutation(deleteAccount)

export const useCreateCategory = () => useFinanceMutation(createCategory)
export const useRenameCategory = () => useFinanceMutation(renameCategory)
export const useArchiveCategory = () => useFinanceMutation(archiveCategory)
export const useReactivateCategory = () => useFinanceMutation(reactivateCategory)
export const useDeleteCategory = () => useFinanceMutation(deleteCategory)

export const useRecordTransaction = () => useFinanceMutation(recordTransaction)
export const useUpdateTransaction = () => useFinanceMutation(updateTransaction)
export const useDeleteTransaction = () => useFinanceMutation(deleteTransaction)

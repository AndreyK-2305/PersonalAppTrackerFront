import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  addContribution,
  adjustCreditRate,
  adjustSavingsRate,
  createFinancedGoal,
  createSavingsGoal,
  deleteFinancedGoal,
  deleteSavingsGoal,
  goalKeys,
  payInstallment,
  payThroughInstallment,
  prepayCredit,
  removeContribution,
  undoCreditRecord,
  updateFinancedGoal,
  updateSavingsGoal,
} from "../api/goals"

/** Mutación de metas: al terminar se invalidan todas las consultas de metas. */
function useGoalsMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.all }),
  })
}

export const useCreateSavingsGoal = () => useGoalsMutation(createSavingsGoal)
export const useUpdateSavingsGoal = () => useGoalsMutation(updateSavingsGoal)

/**
 * Borra una meta. Solo se invalida el listado: la consulta de la meta borrada sigue montada en su
 * página y recargarla respondería 404, lo que pintaría un error justo antes de volver al listado.
 */
export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSavingsGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.savings(), exact: true }),
  })
}
export const useAddContribution = () => useGoalsMutation(addContribution)
export const useRemoveContribution = () => useGoalsMutation(removeContribution)
export const useAdjustSavingsRate = () => useGoalsMutation(adjustSavingsRate)

export const useCreateFinancedGoal = () => useGoalsMutation(createFinancedGoal)
export const useUpdateFinancedGoal = () => useGoalsMutation(updateFinancedGoal)

/** Borra una meta financiada. Solo invalida el listado, igual que {@link useDeleteSavingsGoal}. */
export function useDeleteFinancedGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFinancedGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.financed(), exact: true }),
  })
}

export const usePayInstallment = () => useGoalsMutation(payInstallment)
export const usePayThroughInstallment = () => useGoalsMutation(payThroughInstallment)
export const usePrepayCredit = () => useGoalsMutation(prepayCredit)
export const useAdjustCreditRate = () => useGoalsMutation(adjustCreditRate)
export const useUndoCreditRecord = () => useGoalsMutation(undoCreditRecord)

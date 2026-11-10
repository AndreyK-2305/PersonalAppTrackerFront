import { useMutation, useQueryClient } from "@tanstack/react-query"
import { financeKeys } from "@/features/finance/api/finance"
import {
  addOwnKey,
  captureKeys,
  confirmReview,
  discardReview,
  markNotOwn,
  markOwnTransfer,
  removeOwnKey,
  setReviewAmount,
} from "../api/capture"

/**
 * Mutación de la captura: al terminar invalida la captura y las finanzas, porque las acciones de
 * revisión crean, convierten o borran movimientos.
 */
function useCaptureMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: captureKeys.all }),
        queryClient.invalidateQueries({ queryKey: financeKeys.all }),
      ]),
  })
}

export const useConfirmReview = () => useCaptureMutation(confirmReview)
export const useMarkOwnTransfer = () => useCaptureMutation(markOwnTransfer)
export const useSetReviewAmount = () => useCaptureMutation(setReviewAmount)
export const useDiscardReview = () => useCaptureMutation(discardReview)
export const useMarkNotOwn = () => useCaptureMutation(markNotOwn)
export const useAddOwnKey = () => useCaptureMutation(addOwnKey)
export const useRemoveOwnKey = () => useCaptureMutation(removeOwnKey)

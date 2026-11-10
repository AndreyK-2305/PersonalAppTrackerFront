import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { CheckIcon, InboxIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ErrorState } from "@/components/common/ErrorState"
import { MoneyField } from "@/components/common/MoneyField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import type { Account } from "@/features/finance/api/finance"
import { formatDateTime, formatMoney } from "@/lib/format"
import { reviewsQueryOptions, type Review } from "../api/capture"
import {
  useConfirmReview,
  useDiscardReview,
  useMarkOwnTransfer,
  useSetReviewAmount,
} from "../hooks/use-capture"
import { REVIEW_REASON_LABELS } from "../labels"
import { manualAmountSchema, type ManualAmountInput, type ManualAmountValues } from "../schemas"

const DEPOSIT_KINDS = new Set<Account["kind"]>(["SAVINGS", "CHECKING", "DIGITAL_WALLET"])

/**
 * Notificaciones "Por revisar" (ADR-0017), con las acciones de cada motivo. Se muestra como una
 * vista de Movimientos, no como una sección aparte (D9).
 */
export function ReviewList({ accounts }: { accounts: Account[] }) {
  const reviews = useQuery(reviewsQueryOptions)
  const discardReview = useDiscardReview()
  const [discarding, setDiscarding] = useState<Review | null>(null)

  const confirmDiscard = () => {
    if (!discarding) {
      return
    }
    discardReview.mutate(discarding.id, {
      onSuccess: () => toast.success("Notificación descartada."),
      onError: (error) => toast.error(error.message),
      onSettled: () => setDiscarding(null),
    })
  }

  if (reviews.isPending) {
    return <Skeleton className="h-48 w-full" aria-label="Cargando notificaciones por revisar" />
  }
  if (reviews.isError) {
    return (
      <ErrorState
        icon={InboxIcon}
        title="No fue posible cargar las notificaciones por revisar"
        description={reviews.error.message}
        action={<Button onClick={() => reviews.refetch()}>Reintentar</Button>}
      />
    )
  }
  if (reviews.data.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <InboxIcon className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">No tienes notificaciones por revisar.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.data.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          accounts={accounts}
          onDiscard={() => setDiscarding(review)}
        />
      ))}
      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(open) => !open && setDiscarding(null)}
        title="¿Descartar la notificación?"
        description={
          discarding?.transactionId
            ? "Se borra también el movimiento que generó. La notificación se conserva como descartada."
            : "La notificación se conserva como descartada y no se vuelve a procesar."
        }
        confirmLabel="Descartar"
        onConfirm={confirmDiscard}
        pending={discardReview.isPending}
      />
    </div>
  )
}

function ReviewCard({
  review,
  accounts,
  onDiscard,
}: {
  review: Review
  accounts: Account[]
  onDiscard: () => void
}) {
  const profile = useCurrentProfile()
  const reason = REVIEW_REASON_LABELS[review.reason]
  const product = accounts.find((account) => account.id === review.productId)
  const text = [review.title, review.body].filter(Boolean).join(" — ")

  return (
    <Card role="article" aria-label={reason.title}>
      <CardHeader>
        <CardTitle className="text-base">{reason.title}</CardTitle>
        <CardDescription>{reason.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="text-xs text-muted-foreground">
            {review.app} · {formatDateTime(review.receivedAt, profile.timeZone)}
          </p>
          <p className="mt-1 break-words">
            {text || <span className="text-muted-foreground">El texto ya se borró (45 días).</span>}
          </p>
        </div>
        {review.amount && (
          <p className="text-sm">
            Registrado:{" "}
            <span className="font-medium tabular-nums">{formatMoney(review.amount)}</span>
            {product && <> en {product.name}</>}
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          {review.reason === "POSSIBLE_OWN_TRANSFER" && (
            <OwnTransferActions review={review} accounts={accounts} />
          )}
          {review.reason === "AMBIGUOUS_PRODUCT" && (
            <ConfirmButton review={review} label="Dejar en «Otro»" />
          )}
          {review.reason === "MISSING_EXCHANGE_RATE" && <ManualAmountForm review={review} />}
          <Button variant="ghost" onClick={onDiscard}>
            <Trash2Icon aria-hidden />
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ConfirmButton({ review, label }: { review: Review; label: string }) {
  const confirmReview = useConfirmReview()
  return (
    <Button
      variant="outline"
      disabled={confirmReview.isPending}
      onClick={() =>
        confirmReview.mutate(review.id, {
          onSuccess: () => toast.success("Movimiento confirmado."),
          onError: (error) => toast.error(error.message),
        })
      }
    >
      <CheckIcon aria-hidden />
      {label}
    </Button>
  )
}

function OwnTransferActions({ review, accounts }: { review: Review; accounts: Account[] }) {
  const markOwnTransfer = useMarkOwnTransfer()
  const selectId = useId()
  const destinations = accounts.filter(
    (account) =>
      DEPOSIT_KINDS.has(account.kind) && !account.archived && account.id !== review.productId,
  )
  // Lo que eligió el usuario; mientras no elija, la primera cuenta disponible. Las cuentas pueden
  // llegar después del primer render, así que no se fija en el estado inicial.
  const [chosen, setChosen] = useState<string>()
  const destination =
    chosen && destinations.some((account) => account.id === chosen)
      ? chosen
      : (destinations[0]?.id ?? "")

  return (
    <>
      {destinations.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor={selectId}>Fue a</Label>
          <div className="flex gap-2">
            <NativeSelect
              id={selectId}
              value={destination}
              onChange={(event) => setChosen(event.target.value)}
            >
              {destinations.map((account) => (
                <NativeSelectOption key={account.id} value={account.id}>
                  {account.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              disabled={!destination || markOwnTransfer.isPending}
              onClick={() =>
                markOwnTransfer.mutate(
                  { id: review.id, destinationProductId: destination },
                  {
                    onSuccess: () =>
                      toast.success("Registrada como transferencia entre tus cuentas."),
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            >
              Es mía
            </Button>
          </div>
        </div>
      )}
      <ConfirmButton review={review} label="No es mía" />
    </>
  )
}

function ManualAmountForm({ review }: { review: Review }) {
  const setAmount = useSetReviewAmount()
  const form = useForm<ManualAmountInput, unknown, ManualAmountValues>({
    resolver: zodResolver(manualAmountSchema),
    defaultValues: { amount: "" },
  })
  const onSubmit = form.handleSubmit((values) =>
    setAmount.mutate(
      { id: review.id, amount: values.amount },
      {
        onSuccess: () => toast.success("Compra registrada."),
        onError: (error) => toast.error(error.message),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-2">
      <div className="w-48">
        <MoneyField control={form.control} name="amount" label="Valor en pesos" />
      </div>
      <Button type="submit" disabled={setAmount.isPending}>
        {setAmount.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
        Registrar
      </Button>
    </form>
  )
}

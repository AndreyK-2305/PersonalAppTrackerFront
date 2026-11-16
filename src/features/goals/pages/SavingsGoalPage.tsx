import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PercentIcon,
  PiggyBankIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatMoney } from "@/lib/format"
import {
  goalKeys,
  savingsGoalQueryOptions,
  type Contribution,
  type SavingsGoal,
} from "../api/goals"
import { ContributionDialog } from "../components/ContributionDialog"
import { RateDialog } from "../components/RateDialog"
import { SavingsGoalFormDialog } from "../components/SavingsGoalFormDialog"
import { GoalProgress, GoalProjectionText, GoalStatusBadge } from "../components/SavingsGoalSummary"
import { useDeleteSavingsGoal, useRemoveContribution } from "../hooks/use-goals"
import { formatPercent } from "../schemas"

/** Metas → detalle de una meta de ahorro: avance, proyección, abonos y rentabilidad (ADR-0018). */
export function SavingsGoalPage() {
  const { goalId = "" } = useParams()
  const goal = useQuery(savingsGoalQueryOptions(goalId))

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/metas">
          <ArrowLeftIcon aria-hidden />
          Metas
        </Link>
      </Button>
      {goal.isPending ? (
        <Skeleton className="h-60 w-full" aria-label="Cargando meta" />
      ) : goal.isError ? (
        <ErrorState
          icon={PiggyBankIcon}
          title="No fue posible cargar la meta"
          description={goal.error.message}
          action={<Button onClick={() => goal.refetch()}>Reintentar</Button>}
        />
      ) : (
        <GoalDetail goal={goal.data} />
      )}
    </div>
  )
}

function GoalDetail({ goal }: { goal: SavingsGoal }) {
  const navigate = useNavigate()
  const deleteGoal = useDeleteSavingsGoal()
  const removeContribution = useRemoveContribution()
  const [contributing, setContributing] = useState(false)
  const [adjustingRate, setAdjustingRate] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removing, setRemoving] = useState<Contribution | null>(null)
  const queryClient = useQueryClient()
  const deleted = useRef(false)

  // Al salir de la página de una meta borrada se descarta su consulta, para que no quede en caché.
  useEffect(
    () => () => {
      if (deleted.current) {
        queryClient.removeQueries({ queryKey: goalKeys.savingsGoal(goal.id) })
      }
    },
    [queryClient, goal.id],
  )

  const confirmDelete = () =>
    deleteGoal.mutate(goal.id, {
      onSuccess: () => {
        deleted.current = true
        toast.success("Meta eliminada.")
        navigate("/metas")
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeleting(false),
    })

  const confirmRemove = () => {
    if (!removing) {
      return
    }
    removeContribution.mutate(
      { goalId: goal.id, contributionId: removing.id },
      {
        onSuccess: () => toast.success("Abono eliminado."),
        onError: (error) => toast.error(error.message),
        onSettled: () => setRemoving(null),
      },
    )
  }

  return (
    <>
      <PageHeader
        title={goal.name}
        description={
          goal.plan === "TARGET_DATE"
            ? `Meta para el ${formatDate(goal.targetDate!)}`
            : `Aportando ${formatMoney(goal.monthlyAmount ?? "0", goal.currency)} al mes`
        }
        actions={
          <>
            <Button onClick={() => setContributing(true)}>
              <PlusIcon aria-hidden />
              Registrar abono
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Más acciones">
                  <MoreHorizontalIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <PencilIcon aria-hidden />
                  Editar meta
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAdjustingRate(true)}>
                  <PercentIcon aria-hidden />
                  Rentabilidad
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                  <Trash2Icon aria-hidden />
                  Eliminar meta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">Avance</CardTitle>
            <CardDescription>
              {goal.ratePercent
                ? `Proyección con rentabilidad de ${formatPercent(goal.ratePercent)} % EA.`
                : "Proyección sin rentabilidad."}
            </CardDescription>
          </div>
          <GoalStatusBadge goal={goal} />
        </CardHeader>
        <CardContent className="space-y-4">
          <GoalProgress goal={goal} />
          <p>
            <GoalProjectionText goal={goal} />
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <Stat label="Objetivo" value={formatMoney(goal.targetAmount, goal.currency)} />
            <Stat label="Ahorrado" value={formatMoney(goal.savedAmount, goal.currency)} />
            <Stat label="Falta" value={formatMoney(goal.remainingAmount, goal.currency)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonos</CardTitle>
          <CardDescription>
            Marcas dentro de la meta; no son movimientos de Finanzas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {goal.contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no has registrado abonos.</p>
          ) : (
            <ul className="divide-y" aria-label="Abonos">
              {goal.contributions.map((contribution) => (
                <li
                  key={contribution.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{formatDate(contribution.date)}</span>
                  <span className="ml-auto font-medium tabular-nums">
                    {formatMoney(contribution.amount, goal.currency)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar abono del ${formatDate(contribution.date)}`}
                    onClick={() => setRemoving(contribution)}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {goal.rateChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de rentabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm" aria-label="Historial de rentabilidad">
              {goal.rateChanges.map((change) => (
                <li key={change.effectiveFrom} className="flex justify-between gap-2 py-2">
                  <span className="text-muted-foreground">
                    Desde el {formatDate(change.effectiveFrom)}
                  </span>
                  <span className="tabular-nums">
                    {change.ratePercent === "0"
                      ? "Apagada"
                      : `${formatPercent(change.ratePercent)} % EA`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ContributionDialog goalId={goal.id} open={contributing} onOpenChange={setContributing} />
      <RateDialog
        goalId={goal.id}
        currentPercent={goal.ratePercent}
        open={adjustingRate}
        onOpenChange={setAdjustingRate}
      />
      <SavingsGoalFormDialog open={editing} onOpenChange={setEditing} goal={goal} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`¿Eliminar ${goal.name}?`}
        description="Se borran la meta, sus abonos y su historial de rentabilidad. No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        pending={deleteGoal.isPending}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="¿Eliminar el abono?"
        description={
          removing
            ? `El abono de ${formatMoney(removing.amount, goal.currency)} del ${formatDate(removing.date)} deja de contar en la meta.`
            : ""
        }
        confirmLabel="Eliminar"
        onConfirm={confirmRemove}
        pending={removeContribution.isPending}
      />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

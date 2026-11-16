import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  LandmarkIcon,
  MoreHorizontalIcon,
  PencilIcon,
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
import { formatMoney } from "@/lib/format"
import { compareDecimal } from "@/lib/money"
import { financedGoalQueryOptions, goalKeys, type FinancedGoalDetail } from "../api/goals"
import { AmortizationTable } from "../components/AmortizationTable"
import { FinancedGoalFormDialog } from "../components/FinancedGoalFormDialog"
import { PlanSummary } from "../components/PlanSummary"
import { useDeleteFinancedGoal } from "../hooks/use-goals"
import { formatPercent } from "../schemas"

/** Metas → detalle de una meta financiada: resumen del plan y tabla de amortización (ADR-0018). */
export function FinancedGoalPage() {
  const { goalId = "" } = useParams()
  const detail = useQuery(financedGoalQueryOptions(goalId))

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/metas">
          <ArrowLeftIcon aria-hidden />
          Metas
        </Link>
      </Button>
      {detail.isPending ? (
        <Skeleton className="h-60 w-full" aria-label="Cargando meta" />
      ) : detail.isError ? (
        <ErrorState
          icon={LandmarkIcon}
          title="No fue posible cargar la meta"
          description={detail.error.message}
          action={<Button onClick={() => detail.refetch()}>Reintentar</Button>}
        />
      ) : (
        <FinancedGoalDetailView detail={detail.data} />
      )}
    </div>
  )
}

function FinancedGoalDetailView({ detail }: { detail: FinancedGoalDetail }) {
  const { goal, schedule } = detail
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deleteGoal = useDeleteFinancedGoal()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleted = useRef(false)

  // Al salir de la página de una meta borrada se descarta su consulta, para que no quede en caché.
  useEffect(
    () => () => {
      if (deleted.current) {
        queryClient.removeQueries({ queryKey: goalKeys.financedGoal(goal.id) })
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

  const hasDownPayment = compareDecimal(goal.downPayment, "0") > 0

  return (
    <>
      <PageHeader
        title={goal.name}
        description={`${formatMoney(goal.assetValue, goal.currency)} al ${formatPercent(goal.ratePercent)} % EA en ${goal.installments} cuotas`}
        actions={
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
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                <Trash2Icon aria-hidden />
                Eliminar meta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan de pagos</CardTitle>
          <CardDescription>
            {hasDownPayment
              ? `Con una cuota inicial de ${formatMoney(goal.downPayment, goal.currency)}.`
              : "Sin cuota inicial."}{" "}
            Es un simulador: no crea deudas ni movimientos en Finanzas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSummary summary={goal.summary} currency={goal.currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabla de amortización</CardTitle>
          <CardDescription>
            El interés de cada cuota se calcula sobre el saldo y la última cuota ajusta el residuo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AmortizationTable schedule={schedule} currency={goal.currency} />
        </CardContent>
      </Card>

      <FinancedGoalFormDialog open={editing} onOpenChange={setEditing} goal={goal} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`¿Eliminar ${goal.name}?`}
        description="Se borra la meta con su plan de pagos. No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        pending={deleteGoal.isPending}
      />
    </>
  )
}

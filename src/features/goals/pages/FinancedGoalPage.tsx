import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  BanknoteIcon,
  LandmarkIcon,
  ListChecksIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PercentIcon,
  PiggyBankIcon,
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
import {
  PayInstallmentDialog,
  PayThroughDialog,
  PrepaymentDialog,
} from "../components/CreditPaymentDialogs"
import { CreditProgress, CreditStatusBadge } from "../components/CreditProgress"
import { CreditRecordsList } from "../components/CreditRecordsList"
import { FinancedGoalFormDialog } from "../components/FinancedGoalFormDialog"
import { PlanSummary } from "../components/PlanSummary"
import { RateAdjustmentDialog } from "../components/RateAdjustmentDialog"
import { useDeleteFinancedGoal } from "../hooks/use-goals"
import { formatPercent } from "../schemas"

type OpenDialog = "pay" | "prepay" | "payThrough" | "rate" | "edit" | "delete" | null

/**
 * Metas → detalle de una meta financiada: cómo va el crédito, el plan de pagos, la tabla de
 * amortización y los pagos, abonos y ajustes de tasa registrados (ADR-0018).
 */
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
  const { goal, schedule, records } = detail
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deleteGoal = useDeleteFinancedGoal()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const deleted = useRef(false)
  const paidOff = goal.progress.status === "PAID_OFF"
  const closeOn = (name: OpenDialog) => (open: boolean) => setDialog(open ? name : null)

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
      onSettled: () => setDialog(null),
    })

  const hasDownPayment = compareDecimal(goal.downPayment, "0") > 0

  return (
    <>
      <PageHeader
        title={goal.name}
        description={`${formatMoney(goal.assetValue, goal.currency)} al ${formatPercent(goal.ratePercent)} % EA en ${goal.installments} cuotas`}
        actions={
          <>
            {!paidOff && (
              <Button onClick={() => setDialog("pay")}>
                <BanknoteIcon aria-hidden />
                Pagar cuota
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Más acciones">
                  <MoreHorizontalIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!paidOff && (
                  <>
                    <DropdownMenuItem onSelect={() => setDialog("prepay")}>
                      <PiggyBankIcon aria-hidden />
                      Abonar a capital
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog("payThrough")}>
                      <ListChecksIcon aria-hidden />
                      Marcar cuotas pagadas
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog("rate")}>
                      <PercentIcon aria-hidden />
                      Ajustar tasa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onSelect={() => setDialog("edit")}>
                  <PencilIcon aria-hidden />
                  Editar meta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
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
            <CardTitle className="text-base">Cómo va el crédito</CardTitle>
            <CardDescription>
              Es un simulador: no crea deudas ni movimientos en Finanzas, y pagar tarde no genera
              mora.
            </CardDescription>
          </div>
          <CreditStatusBadge status={goal.progress.status} />
        </CardHeader>
        <CardContent>
          <CreditProgress
            progress={goal.progress}
            currency={goal.currency}
            originalRatePercent={goal.ratePercent}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan de pagos</CardTitle>
          <CardDescription>
            {hasDownPayment
              ? `Con una cuota inicial de ${formatMoney(goal.downPayment, goal.currency)}.`
              : "Sin cuota inicial."}{" "}
            Incluye lo ya pagado y lo que falta, con la cuota y la tasa vigentes.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos del crédito</CardTitle>
          <CardDescription>
            Pagos, abonos y ajustes de tasa. Solo se puede deshacer el último.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreditRecordsList goalId={goal.id} currency={goal.currency} records={records} />
        </CardContent>
      </Card>

      <PayInstallmentDialog goal={goal} open={dialog === "pay"} onOpenChange={closeOn("pay")} />
      <PrepaymentDialog goal={goal} open={dialog === "prepay"} onOpenChange={closeOn("prepay")} />
      <PayThroughDialog
        goal={goal}
        open={dialog === "payThrough"}
        onOpenChange={closeOn("payThrough")}
      />
      <RateAdjustmentDialog goal={goal} open={dialog === "rate"} onOpenChange={closeOn("rate")} />
      <FinancedGoalFormDialog open={dialog === "edit"} onOpenChange={closeOn("edit")} goal={goal} />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={closeOn("delete")}
        title={`¿Eliminar ${goal.name}?`}
        description="Se borra la meta con su plan de pagos y todos sus registros. No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        pending={deleteGoal.isPending}
      />
    </>
  )
}

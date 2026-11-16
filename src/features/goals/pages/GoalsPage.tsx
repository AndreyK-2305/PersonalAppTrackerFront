import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { LandmarkIcon, PiggyBankIcon, PlusIcon, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatMoney } from "@/lib/format"
import {
  financedGoalsQueryOptions,
  savingsGoalsQueryOptions,
  type FinancedGoal,
  type SavingsGoal,
} from "../api/goals"
import { FinancedGoalFormDialog } from "../components/FinancedGoalFormDialog"
import { SavingsGoalFormDialog } from "../components/SavingsGoalFormDialog"
import { GoalProgress, GoalProjectionText, GoalStatusBadge } from "../components/SavingsGoalSummary"

/**
 * Metas → dos secciones (ADR-0018): metas de ahorro, con su avance y su proyección, y metas
 * financiadas, con el resumen de su plan de pagos.
 */
export function GoalsPage() {
  const savings = useQuery(savingsGoalsQueryOptions)
  const financed = useQuery(financedGoalsQueryOptions)
  const navigate = useNavigate()
  const [creatingSavings, setCreatingSavings] = useState(false)
  const [creatingFinanced, setCreatingFinanced] = useState(false)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Metas"
        description="Ahorra para una suma o un bien, o simula la financiación de una compra grande."
      />

      <GoalSection
        title="Ahorro"
        icon={PiggyBankIcon}
        query={savings}
        loadingLabel="Cargando metas de ahorro"
        errorTitle="No fue posible cargar tus metas de ahorro"
        emptyTitle="Aún no tienes metas de ahorro"
        emptyDescription="Crea una para una consola, un viaje o un fondo de emergencia."
        action={
          <Button onClick={() => setCreatingSavings(true)}>
            <PlusIcon aria-hidden />
            Nueva meta de ahorro
          </Button>
        }
        renderGoal={(goal) => <SavingsGoalCard key={goal.id} goal={goal} />}
      />

      <GoalSection
        title="Financiadas"
        icon={LandmarkIcon}
        query={financed}
        loadingLabel="Cargando metas financiadas"
        errorTitle="No fue posible cargar tus metas financiadas"
        emptyTitle="Aún no tienes metas financiadas"
        emptyDescription="Simula el crédito de un vehículo o una vivienda y mira su plan de pagos."
        action={
          <Button variant="outline" onClick={() => setCreatingFinanced(true)}>
            <PlusIcon aria-hidden />
            Nueva meta financiada
          </Button>
        }
        renderGoal={(goal) => <FinancedGoalCard key={goal.id} goal={goal} />}
      />

      <SavingsGoalFormDialog
        open={creatingSavings}
        onOpenChange={setCreatingSavings}
        onSaved={(goal) => navigate(`/metas/ahorro/${goal.id}`)}
      />
      <FinancedGoalFormDialog
        open={creatingFinanced}
        onOpenChange={setCreatingFinanced}
        onSaved={(detail) => navigate(`/metas/financiada/${detail.goal.id}`)}
      />
    </div>
  )
}

function GoalSection<T>({
  title,
  icon: Icon,
  query,
  loadingLabel,
  errorTitle,
  emptyTitle,
  emptyDescription,
  action,
  renderGoal,
}: {
  title: string
  icon: LucideIcon
  query: UseQueryResult<T[]>
  loadingLabel: string
  errorTitle: string
  emptyTitle: string
  emptyDescription: string
  action: ReactNode
  renderGoal: (goal: T) => ReactNode
}) {
  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {query.isPending ? (
        <Skeleton className="h-32 w-full" aria-label={loadingLabel} />
      ) : query.isError ? (
        <ErrorState
          icon={Icon}
          title={errorTitle}
          description={query.error.message}
          action={<Button onClick={() => query.refetch()}>Reintentar</Button>}
        />
      ) : query.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Icon className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">{emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{emptyDescription}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{query.data.map(renderGoal)}</div>
      )}
    </section>
  )
}

function SavingsGoalCard({ goal }: { goal: SavingsGoal }) {
  return (
    <Card role="article" aria-label={goal.name}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="min-w-0 text-base">
          <Link to={`/metas/ahorro/${goal.id}`} className="truncate hover:underline">
            {goal.name}
          </Link>
        </CardTitle>
        <GoalStatusBadge goal={goal} />
      </CardHeader>
      <CardContent className="space-y-3">
        <GoalProgress goal={goal} />
        <p className="text-sm">
          <GoalProjectionText goal={goal} />
        </p>
      </CardContent>
    </Card>
  )
}

function FinancedGoalCard({ goal }: { goal: FinancedGoal }) {
  const { summary } = goal
  return (
    <Card role="article" aria-label={goal.name}>
      <CardHeader>
        <CardTitle className="min-w-0 text-base">
          <Link to={`/metas/financiada/${goal.id}`} className="truncate hover:underline">
            {goal.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <strong className="text-base tabular-nums">
            {formatMoney(summary.installmentAmount, goal.currency)}
          </strong>{" "}
          al mes durante {summary.scheduledInstallments} cuotas
        </p>
        <p className="text-muted-foreground">
          Financias {formatMoney(summary.financedAmount, goal.currency)} y pagas{" "}
          {formatMoney(summary.totalInterest, goal.currency)} de intereses. Última cuota:{" "}
          {formatDate(summary.lastDueDate)}.
        </p>
      </CardContent>
    </Card>
  )
}

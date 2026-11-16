import { useQuery } from "@tanstack/react-query"
import { PiggyBankIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { savingsGoalsQueryOptions } from "../api/goals"
import { SavingsGoalFormDialog } from "../components/SavingsGoalFormDialog"
import { GoalProgress, GoalProjectionText, GoalStatusBadge } from "../components/SavingsGoalSummary"

/** Metas → listado de metas de ahorro con su avance y su proyección (ADR-0018). */
export function GoalsPage() {
  const goals = useQuery(savingsGoalsQueryOptions)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        description="Ahorra para una suma o un bien y mira cuánto apartar cada mes."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon aria-hidden />
            Nueva meta
          </Button>
        }
      />

      {goals.isPending ? (
        <Skeleton className="h-40 w-full" aria-label="Cargando metas" />
      ) : goals.isError ? (
        <ErrorState
          icon={PiggyBankIcon}
          title="No fue posible cargar tus metas"
          description={goals.error.message}
          action={<Button onClick={() => goals.refetch()}>Reintentar</Button>}
        />
      ) : goals.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <PiggyBankIcon className="size-8 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">Aún no tienes metas</p>
              <p className="text-sm text-muted-foreground">
                Crea una para una consola, un viaje o un fondo de emergencia.
              </p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <PlusIcon aria-hidden />
              Crear la primera
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.data.map((goal) => (
            <Card key={goal.id} role="article" aria-label={goal.name}>
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
          ))}
        </div>
      )}

      <SavingsGoalFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(goal) => navigate(`/metas/ahorro/${goal.id}`)}
      />
    </div>
  )
}

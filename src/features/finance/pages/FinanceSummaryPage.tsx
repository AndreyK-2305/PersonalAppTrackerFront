import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ChartColumnIcon, PlusIcon, WalletIcon } from "lucide-react"
import { useState } from "react"
import { Link, useSearchParams } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { todayIn } from "@/lib/dates"
import { formatDate, formatMoney } from "@/lib/format"
import { isNegativeDecimal } from "@/lib/money"
import { cn } from "@/lib/utils"
import {
  accountsQueryOptions,
  categoriesQueryOptions,
  summaryQueryOptions,
  transactionsQueryOptions,
  type Account,
  type PeriodKind,
  type Summary,
  type Transaction,
} from "../api/finance"
import { PeriodSelector } from "../components/PeriodSelector"
import { ExpensesByCategory, SummaryKpis, TrendChart } from "../components/SummaryCharts"
import { TransactionAmount } from "../components/TransactionAmount"
import { TransactionFormDialog } from "../components/TransactionFormDialog"
import { ACCOUNT_KIND_LABELS, TRANSACTION_TYPE_LABELS } from "../labels"
import { categoryOptions, namesById } from "../lookups"
import { PERIOD_PARAMS, periodFromParam } from "../periods"

/**
 * Inicio de Finanzas (dashboard). Combina el resumen del periodo con los saldos de los productos y
 * los últimos movimientos. El periodo vive en la URL: ?periodo=dia|semana|mes&fecha=AAAA-MM-DD.
 */
export function FinanceSummaryPage() {
  const { timeZone } = useCurrentProfile()
  const [params, setParams] = useSearchParams()
  const period = periodFromParam(params.get("periodo"))
  const date = params.get("fecha") ?? undefined
  const summary = useQuery({
    ...summaryQueryOptions(period, date),
    placeholderData: keepPreviousData,
  })
  const accounts = useQuery(accountsQueryOptions)
  const categories = useQuery(categoriesQueryOptions)
  const recent = useQuery(transactionsQueryOptions({ size: 5 }))
  const [formOpen, setFormOpen] = useState(false)

  const accountList = accounts.data?.accounts ?? []
  const accountNames = namesById(accountList)
  const hasOwnAccounts = accountList.some((account) => !account.systemManaged)

  const setPeriod = (kind: PeriodKind, nextDate: string | undefined) =>
    setParams(() => {
      const next = new URLSearchParams()
      if (kind !== "MONTH") {
        next.set("periodo", PERIOD_PARAMS[kind])
      }
      if (nextDate) {
        next.set("fecha", nextDate)
      }
      return next
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen"
        description="Tus ingresos, gastos y saldos en un vistazo."
        actions={
          <Button
            onClick={() => setFormOpen(true)}
            disabled={accounts.isPending || categories.isPending}
          >
            <PlusIcon aria-hidden />
            Nuevo movimiento
          </Button>
        }
      />

      {accounts.isSuccess && !hasOwnAccounts && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium">Empieza registrando tus productos</p>
              <p className="text-sm text-muted-foreground">
                Agrega tu efectivo, tus cuentas y tus tarjetas para ver sus saldos aquí.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/finanzas/productos">
                <WalletIcon aria-hidden />
                Ir a productos
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {summary.isPending ? (
        <div className="space-y-4" aria-label="Cargando el resumen">
          <Skeleton className="h-9 w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-32" />
            ))}
          </div>
        </div>
      ) : summary.isError ? (
        <ErrorState
          icon={ChartColumnIcon}
          title="No fue posible cargar el resumen"
          description={summary.error.message}
          action={<Button onClick={() => summary.refetch()}>Reintentar</Button>}
        />
      ) : (
        <SummarySections
          summary={summary.data}
          today={todayIn(timeZone)}
          onKindChange={(kind) => setPeriod(kind, undefined)}
          onDateChange={(nextDate) => setPeriod(summary.data.kind, nextDate)}
          accountNames={accountNames}
          categoryNames={namesById(categoryOptions(categories.data ?? []))}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AccountBalances
          accounts={accountList}
          netWorth={accounts.data?.netWorth}
          currency={accounts.data?.currency}
          loading={accounts.isPending}
        />
        <RecentTransactions
          transactions={recent.data?.items}
          loading={recent.isPending}
          accountNames={accountNames}
        />
      </div>

      {formOpen && (
        <TransactionFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          accounts={accountList}
          categories={categories.data ?? []}
        />
      )}
    </div>
  )
}

function SummarySections({
  summary,
  today,
  onKindChange,
  onDateChange,
  accountNames,
  categoryNames,
}: {
  summary: Summary
  today: string
  onKindChange: (kind: PeriodKind) => void
  onDateChange: (date: string | undefined) => void
  accountNames: Map<string, string>
  categoryNames: Map<string, string>
}) {
  return (
    <div className="space-y-6">
      <PeriodSelector
        kind={summary.kind}
        start={summary.start}
        end={summary.end}
        today={today}
        onKindChange={onKindChange}
        onDateChange={onDateChange}
      />
      <SummaryKpis summary={summary} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TrendChart summary={summary} />
        </div>
        <div className="lg:col-span-2">
          <ExpensesByCategory
            totals={summary.expensesByCategory}
            categoryNames={categoryNames}
            currency={summary.currency}
          />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Por producto</CardTitle>
          <CardDescription>Ingresos y gastos del periodo en cada producto.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.byAccount.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay ingresos ni gastos en este periodo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.byAccount.map((totals) => (
                  <TableRow key={totals.accountId}>
                    <TableCell>
                      {accountNames.get(totals.accountId) ?? "Producto eliminado"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(totals.income, summary.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(totals.expense, summary.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AccountBalances({
  accounts,
  netWorth,
  currency,
  loading,
}: {
  accounts: Account[]
  netWorth?: string
  currency?: string
  loading: boolean
}) {
  const withBalance = accounts.filter((account) => !account.archived && !account.systemManaged)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldos</CardTitle>
        <CardDescription>
          Patrimonio:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {netWorth ? formatMoney(netWorth, currency) : "—"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : withBalance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes productos con saldo.</p>
        ) : (
          <ul className="divide-y">
            {withBalance.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNT_KIND_LABELS[account.kind]}
                  </p>
                </div>
                <BalanceText account={account} />
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/finanzas/productos">Ver productos</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function BalanceText({ account }: { account: Account }) {
  if (account.kind === "CREDIT_CARD") {
    return (
      <span className="text-right tabular-nums">
        <span className="block font-medium">
          Deuda {formatMoney(account.debt ?? "0", account.currency)}
        </span>
        <span className="block text-xs text-muted-foreground">
          Disponible {formatMoney(account.availableCredit ?? "0", account.currency)}
        </span>
      </span>
    )
  }
  const balance = account.balance ?? "0"
  return (
    <span
      className={cn("font-medium tabular-nums", isNegativeDecimal(balance) && "text-destructive")}
    >
      {formatMoney(balance, account.currency)}
    </span>
  )
}

function RecentTransactions({
  transactions,
  loading,
  accountNames,
}: {
  transactions?: Transaction[]
  loading: boolean
  accountNames: Map<string, string>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos movimientos</CardTitle>
        <CardDescription>Los más recientes por fecha.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : !transactions || transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has registrado movimientos.</p>
        ) : (
          <ul className="divide-y">
            {transactions.map((transaction) => {
              const account = transaction.sourceAccountId ?? transaction.destinationAccountId
              return (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {transaction.description ??
                        transaction.merchant ??
                        TRANSACTION_TYPE_LABELS[transaction.type]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                      {account && ` · ${accountNames.get(account) ?? ""}`}
                    </p>
                  </div>
                  <TransactionAmount transaction={transaction} />
                </li>
              )
            })}
          </ul>
        )}
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/finanzas/movimientos">Ver todos los movimientos</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

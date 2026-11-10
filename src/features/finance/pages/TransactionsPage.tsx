import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RadioTowerIcon,
  ReceiptTextIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useId, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { reviewsQueryOptions } from "@/features/capture/api/capture"
import { ReviewList } from "@/features/capture/components/ReviewList"
import { useMarkNotOwn } from "@/features/capture/hooks/use-capture"
import { formatDate } from "@/lib/format"
import {
  accountsQueryOptions,
  categoriesQueryOptions,
  transactionsQueryOptions,
  type Transaction,
  type TransactionFilters,
  type TransactionSort,
  type TransactionType,
} from "../api/finance"
import { TransactionAmount } from "../components/TransactionAmount"
import { TransactionFormDialog } from "../components/TransactionFormDialog"
import { useDeleteTransaction } from "../hooks/use-finance"
import { PAYMENT_CHANNEL_LABELS, TRANSACTION_TYPE_LABELS } from "../labels"
import { categoryOptions, namesById } from "../lookups"

const PAGE_SIZE = 20

const SORT_LABELS: Record<TransactionSort, string> = {
  "date,desc": "Más recientes primero",
  "date,asc": "Más antiguos primero",
  "amount,desc": "Mayor monto primero",
  "amount,asc": "Menor monto primero",
}

/**
 * Vistas de Movimientos (D9): todos, "Por revisar" (notificaciones de la captura que esperan una
 * decisión) y "Por clasificar" (ingresos y gastos sin categoría).
 */
type View = "todos" | "revisar" | "clasificar"

function viewFrom(params: URLSearchParams): View {
  const value = params.get("vista")
  return value === "revisar" || value === "clasificar" ? value : "todos"
}

/**
 * Los filtros viven en la URL (en español) para que se puedan compartir y el botón Atrás funcione:
 * ?vista=&desde=&hasta=&producto=&categoria=&tipo=&q=&orden=&pagina=
 */
function filtersFrom(params: URLSearchParams): TransactionFilters {
  const page = Number(params.get("pagina") ?? "1")
  return {
    from: params.get("desde") || undefined,
    to: params.get("hasta") || undefined,
    accountId: params.get("producto") || undefined,
    categoryId: params.get("categoria") || undefined,
    type: (params.get("tipo") || undefined) as TransactionType | undefined,
    q: params.get("q") || undefined,
    uncategorized: viewFrom(params) === "clasificar" || undefined,
    sort: (params.get("orden") || undefined) as TransactionSort | undefined,
    page: Number.isInteger(page) && page > 1 ? page - 1 : undefined,
    size: PAGE_SIZE,
  }
}

export function TransactionsPage() {
  const [params, setParams] = useSearchParams()
  const view = viewFrom(params)
  const filters = filtersFrom(params)
  const transactions = useQuery({
    ...transactionsQueryOptions(filters),
    placeholderData: keepPreviousData,
    enabled: view !== "revisar",
  })
  const reviews = useQuery(reviewsQueryOptions)
  const markNotOwn = useMarkNotOwn()
  const accounts = useQuery(accountsQueryOptions)
  const categories = useQuery(categoriesQueryOptions)
  const deleteTransaction = useDeleteTransaction()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>()
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const accountList = accounts.data?.accounts ?? []
  const categoryList = categories.data ?? []
  const accountNames = namesById(accountList)
  const categoryNames = namesById(categoryOptions(categoryList))
  const hasFilters = ["desde", "hasta", "producto", "categoria", "tipo", "q"].some((key) =>
    params.has(key),
  )

  /** Cambia un filtro y vuelve a la primera página. */
  const setFilter = (key: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete("pagina")
      return next
    })
  }
  const setView = (next: string) =>
    setParams((current) => {
      const params = new URLSearchParams(current)
      if (next === "todos") {
        params.delete("vista")
      } else {
        params.set("vista", next)
      }
      params.delete("pagina")
      return params
    })
  const goToPage = (page: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set("pagina", String(page))
      return next
    })
  const openForm = (transaction?: Transaction) => {
    setEditing(transaction)
    setFormOpen(true)
  }
  const confirmDelete = () => {
    if (!deleting) {
      return
    }
    deleteTransaction.mutate(deleting.id, {
      onSuccess: () => toast.success("Movimiento eliminado."),
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeleting(null),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Ingresos, gastos, transferencias entre tus productos y ajustes de saldo."
        actions={
          <Button onClick={() => openForm()} disabled={accounts.isPending || categories.isPending}>
            <PlusIcon aria-hidden />
            Nuevo movimiento
          </Button>
        }
      />

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="revisar">
            Por revisar
            {(reviews.data?.length ?? 0) > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 tabular-nums">{reviews.data?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clasificar">Por clasificar</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "revisar" ? (
        <ReviewList accounts={accountList} />
      ) : (
        <>
          <TransactionFiltersBar
            params={params}
            accounts={accountList.map((account) => ({ value: account.id, label: account.name }))}
            categories={categoryOptions(categoryList).map((option) => ({
              value: option.id,
              label: option.label,
            }))}
            onChange={setFilter}
            onClear={() => setParams({})}
            hasFilters={hasFilters}
          />

          {transactions.isPending ? (
            <Skeleton className="h-72 w-full" aria-label="Cargando movimientos" />
          ) : transactions.isError ? (
            <ErrorState
              icon={ReceiptTextIcon}
              title="No fue posible cargar tus movimientos"
              description={transactions.error.message}
              action={<Button onClick={() => transactions.refetch()}>Reintentar</Button>}
            />
          ) : transactions.data.totalItems === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-10 text-center">
              <ReceiptTextIcon className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Ningún movimiento coincide con los filtros."
                  : view === "clasificar"
                    ? "Todos tus ingresos y gastos tienen categoría."
                    : "Aún no has registrado movimientos."}
              </p>
              {!hasFilters && view === "todos" && (
                <Button onClick={() => openForm()}>
                  <PlusIcon aria-hidden />
                  Registrar el primero
                </Button>
              )}
            </Card>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data.items.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <TransactionDetail transaction={transaction} />
                      </TableCell>
                      <TableCell>
                        {transaction.type === "INCOME" || transaction.type === "EXPENSE" ? (
                          transaction.categoryId ? (
                            categoryNames.get(transaction.categoryId)
                          ) : (
                            <span className="text-muted-foreground">Sin categoría</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TransactionAccounts transaction={transaction} names={accountNames} />
                      </TableCell>
                      <TableCell className="text-right">
                        <TransactionAmount transaction={transaction} />
                      </TableCell>
                      <TableCell className="w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Acciones del movimiento"
                            >
                              <MoreHorizontalIcon aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openForm(transaction)}>
                              <PencilIcon aria-hidden />
                              Editar
                            </DropdownMenuItem>
                            {transaction.origin === "CAPTURE" &&
                              transaction.type === "TRANSFER" && (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    markNotOwn.mutate(transaction.id, {
                                      onSuccess: () => toast.success("Registrada como gasto."),
                                      onError: (error) => toast.error(error.message),
                                    })
                                  }
                                >
                                  <ArrowUpRightIcon aria-hidden />
                                  No es mía: es un gasto
                                </DropdownMenuItem>
                              )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleting(transaction)}
                            >
                              <Trash2Icon aria-hidden />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  Página {transactions.data.page + 1} de {transactions.data.totalPages} ·{" "}
                  {transactions.data.totalItems} movimientos
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(transactions.data.page)}
                    disabled={transactions.data.page === 0}
                  >
                    <ChevronLeftIcon aria-hidden />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(transactions.data.page + 2)}
                    disabled={transactions.data.page + 1 >= transactions.data.totalPages}
                  >
                    Siguiente
                    <ChevronRightIcon aria-hidden />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {formOpen && (
        <TransactionFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          accounts={accountList}
          categories={categoryList}
          transaction={editing}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar el movimiento?"
        description="El borrado es definitivo y no se puede deshacer. Los saldos y reportes se recalculan."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        pending={deleteTransaction.isPending}
      />
    </div>
  )
}

function TransactionDetail({ transaction }: { transaction: Transaction }) {
  const title =
    transaction.description ?? transaction.merchant ?? TRANSACTION_TYPE_LABELS[transaction.type]
  const extra = [
    transaction.description && transaction.merchant,
    transaction.channel && PAYMENT_CHANNEL_LABELS[transaction.channel],
    (transaction.type === "TRANSFER" || transaction.type === "ADJUSTMENT") &&
      transaction.description &&
      TRANSACTION_TYPE_LABELS[transaction.type],
  ].filter(Boolean)

  const captured = transaction.origin === "CAPTURE"

  // El título va solo en su línea para que no lo corten las marcas; las marcas acompañan los datos
  // secundarios.
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{title}</p>
      {(extra.length > 0 || captured || transaction.amountEstimated) && (
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {captured && (
            <Badge
              variant="outline"
              className="shrink-0 gap-1"
              title="Registrado desde una notificación"
            >
              <RadioTowerIcon aria-hidden />
              Captado
            </Badge>
          )}
          {transaction.amountEstimated && (
            <Badge
              variant="secondary"
              className="shrink-0"
              title="Convertido de dólares con la TRM; corrígelo con el valor del extracto"
            >
              Monto estimado
            </Badge>
          )}
          {extra.length > 0 && <span className="truncate">{extra.join(" · ")}</span>}
        </div>
      )}
    </div>
  )
}

function TransactionAccounts({
  transaction,
  names,
}: {
  transaction: Transaction
  names: Map<string, string>
}) {
  const name = (id?: string | null) => (id ? (names.get(id) ?? "Producto eliminado") : "—")
  if (transaction.type === "TRANSFER") {
    return (
      <span className="flex items-center gap-1 whitespace-nowrap">
        {name(transaction.sourceAccountId)}
        <ArrowRightLeftIcon className="size-3.5 text-muted-foreground" aria-label="hacia" />
        {name(transaction.destinationAccountId)}
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap">
      {name(transaction.sourceAccountId ?? transaction.destinationAccountId)}
    </span>
  )
}

interface Option {
  value: string
  label: string
}

function TransactionFiltersBar({
  params,
  accounts,
  categories,
  onChange,
  onClear,
  hasFilters,
}: {
  params: URLSearchParams
  accounts: Option[]
  categories: Option[]
  onChange: (key: string, value: string) => void
  onClear: () => void
  hasFilters: boolean
}) {
  const id = useId()
  const [text, setText] = useState(params.get("q") ?? "")
  const search = (event: FormEvent) => {
    event.preventDefault()
    onChange("q", text.trim())
  }
  // El valor por defecto no se escribe en la URL.
  const select = (key: string, label: string, options: Option[], defaultValue = "") => (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <NativeSelect
        id={`${id}-${key}`}
        value={params.get(key) ?? defaultValue}
        onChange={(event) =>
          onChange(key, event.target.value === defaultValue ? "" : event.target.value)
        }
        className="w-full"
      >
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )

  return (
    <Card className="gap-4 p-4">
      <form onSubmit={search} className="flex gap-2" role="search">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Buscar en la descripción o el comercio"
            aria-label="Buscar movimientos"
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-desde`}>Desde</Label>
          <Input
            id={`${id}-desde`}
            type="date"
            value={params.get("desde") ?? ""}
            onChange={(event) => onChange("desde", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-hasta`}>Hasta</Label>
          <Input
            id={`${id}-hasta`}
            type="date"
            value={params.get("hasta") ?? ""}
            onChange={(event) => onChange("hasta", event.target.value)}
          />
        </div>
        {select("tipo", "Tipo", [
          { value: "", label: "Todos" },
          ...Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
        ])}
        {select("producto", "Producto", [{ value: "", label: "Todos" }, ...accounts])}
        {select("categoria", "Categoría", [{ value: "", label: "Todas" }, ...categories])}
        {select(
          "orden",
          "Orden",
          Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label })),
          "date,desc",
        )}
      </div>
      {hasFilters && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setText("")
              onClear()
            }}
          >
            <XIcon aria-hidden />
            Quitar filtros
          </Button>
        </div>
      )}
    </Card>
  )
}

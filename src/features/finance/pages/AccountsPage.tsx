import { useQuery } from "@tanstack/react-query"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
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
import { isNegativeDecimal } from "@/lib/money"
import { cn } from "@/lib/utils"
import { accountsQueryOptions, type Account } from "../api/finance"
import { AccountFormDialog } from "../components/AccountFormDialog"
import { useArchiveAccount, useDeleteAccount, useReactivateAccount } from "../hooks/use-finance"
import { ACCOUNT_KIND_LABELS } from "../labels"

export function AccountsPage() {
  const accounts = useQuery(accountsQueryOptions)
  const archiveAccount = useArchiveAccount()
  const reactivateAccount = useReactivateAccount()
  const deleteAccount = useDeleteAccount()
  const [formOpen, setFormOpen] = useState(false)
  // Cambia en cada apertura: el formulario se monta de nuevo y empieza con los datos correctos,
  // sin depender de que el diálogo anterior termine de cerrarse.
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<Account | undefined>()
  const [deleting, setDeleting] = useState<Account | null>(null)

  const openForm = (account?: Account) => {
    setEditing(account)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }
  const toggleArchived = (account: Account) => {
    const mutation = account.archived ? reactivateAccount : archiveAccount
    mutation.mutate(account.id, {
      onSuccess: () =>
        toast.success(account.archived ? "Producto reactivado." : "Producto archivado."),
      onError: (error) => toast.error(error.message),
    })
  }
  const confirmDelete = () => {
    if (!deleting) {
      return
    }
    deleteAccount.mutate(deleting.id, {
      onSuccess: () => toast.success("Producto eliminado."),
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeleting(null),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Tu efectivo, cuentas, billeteras y tarjetas, con su saldo actual."
        actions={
          <Button onClick={() => openForm()}>
            <PlusIcon aria-hidden />
            Nuevo producto
          </Button>
        }
      />

      {accounts.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando productos">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-36" />
          ))}
        </div>
      ) : accounts.isError ? (
        <ErrorState
          icon={WalletIcon}
          title="No fue posible cargar tus productos"
          description={accounts.error.message}
          action={<Button onClick={() => accounts.refetch()}>Reintentar</Button>}
        />
      ) : (
        <AccountSections
          accounts={accounts.data.accounts}
          netWorth={accounts.data.netWorth}
          currency={accounts.data.currency}
          onCreate={() => openForm()}
          actions={{ onEdit: openForm, onToggleArchived: toggleArchived, onDelete: setDeleting }}
        />
      )}

      <AccountFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar ${deleting?.name ?? "el producto"}?`}
        description="Esta acción no se puede deshacer. Si el producto tiene movimientos, archívalo en su lugar."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        pending={deleteAccount.isPending}
      />
    </div>
  )
}

interface AccountActions {
  onEdit: (account: Account) => void
  onToggleArchived: (account: Account) => void
  onDelete: (account: Account) => void
}

function AccountSections({
  accounts,
  netWorth,
  currency,
  onCreate,
  actions,
}: {
  accounts: Account[]
  netWorth: string
  currency: string
  onCreate: () => void
  actions: AccountActions
}) {
  const active = accounts.filter((account) => !account.archived && !account.systemManaged)
  const archived = accounts.filter((account) => account.archived)
  const other = accounts.find((account) => account.systemManaged)

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardDescription>Patrimonio</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{formatMoney(netWorth, currency)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Suma de tus saldos: lo que tienes menos lo que debes en tarjetas.
        </CardContent>
      </Card>

      {active.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <WalletIcon className="size-8 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">Aún no tienes productos</p>
              <p className="text-sm text-muted-foreground">
                Registra tu efectivo, tus cuentas y tus tarjetas para llevar sus saldos.
              </p>
            </div>
            <Button onClick={onCreate}>
              <PlusIcon aria-hidden />
              Crear el primero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((account) => (
            <AccountCard key={account.id} account={account} actions={actions} />
          ))}
        </div>
      )}

      {other && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Producto de sistema</h2>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-base">{other.name}</CardTitle>
              <CardDescription>
                Recibe los movimientos cuyo producto no se identifica. No lleva saldo ni se puede
                borrar; edita esos movimientos para asignarles su producto real.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Archivados</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((account) => (
              <AccountCard key={account.id} account={account} actions={actions} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AccountCard({ account, actions }: { account: Account; actions: AccountActions }) {
  const isCard = account.kind === "CREDIT_CARD"
  const balance = account.balance ?? "0"

  return (
    <Card role="article" className={cn(account.archived && "opacity-70")} aria-label={account.name}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate text-base">{account.name}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{ACCOUNT_KIND_LABELS[account.kind]}</span>
            {account.institution && <span>· {account.institution}</span>}
            {account.lastFourDigits && (
              <span className="tabular-nums">•••• {account.lastFourDigits}</span>
            )}
            {account.archived && <Badge variant="secondary">Archivado</Badge>}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${account.name}`}>
              <MoreHorizontalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => actions.onEdit(account)}>
              <PencilIcon aria-hidden />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.onToggleArchived(account)}>
              {account.archived ? <ArchiveRestoreIcon aria-hidden /> : <ArchiveIcon aria-hidden />}
              {account.archived ? "Reactivar" : "Archivar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(account)}>
              <Trash2Icon aria-hidden />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        {isCard ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Deuda</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(account.debt ?? "0", account.currency)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Disponible {formatMoney(account.availableCredit ?? "0", account.currency)} de{" "}
              {formatMoney(account.creditLimit ?? "0", account.currency)}
            </p>
          </>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                isNegativeDecimal(balance) && "text-destructive",
              )}
            >
              {formatMoney(balance, account.currency)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

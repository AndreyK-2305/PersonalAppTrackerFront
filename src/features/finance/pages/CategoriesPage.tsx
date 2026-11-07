import { useQuery } from "@tanstack/react-query"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  FolderTreeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { categoriesQueryOptions, type Category, type CategoryKind } from "../api/finance"
import { CreateCategoryDialog, RenameCategoryDialog } from "../components/CategoryDialogs"
import { useArchiveCategory, useDeleteCategory, useReactivateCategory } from "../hooks/use-finance"
import { CATEGORY_KIND_LABELS } from "../labels"

interface CategoryActions {
  onAddChild: (parent: Category) => void
  onRename: (category: Category) => void
  onToggleArchived: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoriesPage() {
  const categories = useQuery(categoriesQueryOptions)
  const archiveCategory = useArchiveCategory()
  const reactivateCategory = useReactivateCategory()
  const deleteCategory = useDeleteCategory()
  const [kind, setKind] = useState<CategoryKind>("EXPENSE")
  const [creating, setCreating] = useState<{ kind: CategoryKind; parentId?: string } | null>(null)
  // Cambia en cada apertura para que el formulario empiece vacío (ver AccountsPage).
  const [createKey, setCreateKey] = useState(0)
  const [renaming, setRenaming] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const openCreate = (value: { kind: CategoryKind; parentId?: string }) => {
    setCreateKey((key) => key + 1)
    setCreating(value)
  }
  const actions: CategoryActions = {
    onAddChild: (parent) => openCreate({ kind: parent.kind, parentId: parent.id }),
    onRename: setRenaming,
    onToggleArchived: (category) => {
      const mutation = category.archived ? reactivateCategory : archiveCategory
      mutation.mutate(category.id, {
        onSuccess: () =>
          toast.success(category.archived ? "Categoría reactivada." : "Categoría archivada."),
        onError: (error) => toast.error(error.message),
      })
    },
    onDelete: setDeleting,
  }
  const confirmDelete = () => {
    if (!deleting) {
      return
    }
    deleteCategory.mutate(deleting.id, {
      onSuccess: () => toast.success("Categoría eliminada."),
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeleting(null),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Clasifica tus ingresos y gastos en categorías y subcategorías."
        actions={
          <Button onClick={() => openCreate({ kind })}>
            <PlusIcon aria-hidden />
            Nueva categoría
          </Button>
        }
      />

      {categories.isPending ? (
        <Skeleton className="h-64 w-full" aria-label="Cargando categorías" />
      ) : categories.isError ? (
        <ErrorState
          icon={FolderTreeIcon}
          title="No fue posible cargar tus categorías"
          description={categories.error.message}
          action={<Button onClick={() => categories.refetch()}>Reintentar</Button>}
        />
      ) : (
        <Tabs value={kind} onValueChange={(value) => setKind(value as CategoryKind)}>
          <TabsList>
            {(["EXPENSE", "INCOME"] as const).map((option) => (
              <TabsTrigger key={option} value={option}>
                {CATEGORY_KIND_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
          {(["EXPENSE", "INCOME"] as const).map((option) => (
            <TabsContent key={option} value={option}>
              <CategoryTree
                categories={categories.data.filter((category) => category.kind === option)}
                onCreate={() => openCreate({ kind: option })}
                actions={actions}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <CreateCategoryDialog
        key={createKey}
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        categories={categories.data ?? []}
        initialKind={creating?.kind ?? kind}
        initialParentId={creating?.parentId}
      />
      <RenameCategoryDialog
        category={renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar ${deleting?.name ?? "la categoría"}?`}
        description="Esta acción no se puede deshacer. Si la categoría tiene movimientos o subcategorías, archívala en su lugar."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        pending={deleteCategory.isPending}
      />
    </div>
  )
}

function CategoryTree({
  categories,
  onCreate,
  actions,
}: {
  categories: Category[]
  onCreate: () => void
  actions: CategoryActions
}) {
  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <FolderTreeIcon className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Aún no tienes categorías de este tipo.</p>
          <Button onClick={onCreate}>
            <PlusIcon aria-hidden />
            Crear una categoría
          </Button>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="py-0">
      <ul className="divide-y">
        {categories.map((category) => (
          <li key={category.id}>
            <CategoryRow category={category} actions={actions} />
            {category.subcategories.length > 0 && (
              <ul className="divide-y border-t bg-muted/30">
                {category.subcategories.map((child) => (
                  <li key={child.id} className="pl-6">
                    <CategoryRow category={child} actions={actions} isChild />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function CategoryRow({
  category,
  actions,
  isChild = false,
}: {
  category: Category
  actions: CategoryActions
  isChild?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <div className={cn("flex min-w-0 items-center gap-2", category.archived && "opacity-60")}>
        <span className={cn("truncate", !isChild && "font-medium")}>{category.name}</span>
        {category.archived && <Badge variant="secondary">Archivada</Badge>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${category.name}`}>
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isChild && !category.archived && (
            <DropdownMenuItem onSelect={() => actions.onAddChild(category)}>
              <PlusIcon aria-hidden />
              Agregar subcategoría
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => actions.onRename(category)}>
            <PencilIcon aria-hidden />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => actions.onToggleArchived(category)}>
            {category.archived ? <ArchiveRestoreIcon aria-hidden /> : <ArchiveIcon aria-hidden />}
            {category.archived ? "Reactivar" : "Archivar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(category)}>
            <Trash2Icon aria-hidden />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

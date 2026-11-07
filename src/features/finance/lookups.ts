import type { Account, Category, CategoryKind } from "./api/finance"

/** Categoría en forma plana para selectores y etiquetas: "Alimentación / Mercado". */
export interface CategoryOption {
  id: string
  kind: CategoryKind
  label: string
  archived: boolean
}

/** Aplana el árbol de categorías: cada principal seguida de sus subcategorías. */
export function categoryOptions(categories: Category[]): CategoryOption[] {
  return categories.flatMap((parent) => [
    { id: parent.id, kind: parent.kind, label: parent.name, archived: parent.archived },
    ...parent.subcategories.map((child) => ({
      id: child.id,
      kind: child.kind,
      label: `${parent.name} / ${child.name}`,
      archived: child.archived,
    })),
  ])
}

/** Nombres por identificador, para mostrar movimientos y resúmenes. */
export function namesById(
  items: { id: string; label?: string; name?: string }[],
): Map<string, string> {
  return new Map(items.map((item) => [item.id, item.label ?? item.name ?? ""]))
}

/**
 * Productos que se pueden elegir en un formulario: los activos y, al editar, también el que ya
 * tenía asignado aunque esté archivado (ADR-0015). Las transferencias y los ajustes excluyen "Otro".
 */
export function selectableAccounts(
  accounts: Account[],
  { withOther, keep }: { withOther: boolean; keep?: string },
): Account[] {
  return accounts.filter(
    (account) =>
      (withOther || !account.systemManaged) && (!account.archived || account.id === keep),
  )
}

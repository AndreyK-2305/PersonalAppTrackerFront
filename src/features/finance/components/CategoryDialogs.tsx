import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useId, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { setServerErrors } from "@/lib/form-errors"
import type { Category, CategoryKind } from "../api/finance"
import { useCreateCategory, useRenameCategory } from "../hooks/use-finance"
import { CATEGORY_KIND_LABELS } from "../labels"
import { categoryFormSchema, type CategoryFormValues } from "../schemas"

const FIELDS = ["kind", "name", "parentId"] as const
const FIELD_BY_CODE = {
  "finance.category.name_taken": "name",
  "finance.category.name_invalid": "name",
  "finance.category.kind_mismatch": "parentId",
  "finance.category.depth_exceeded": "parentId",
  "finance.category.archived": "parentId",
} as const

interface CreateCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  /** Tipo y categoría principal que el formulario propone al abrirse. */
  initialKind: CategoryKind
  initialParentId?: string
}

/** Crea una categoría principal o, si se elige la principal, una subcategoría del mismo tipo. */
export function CreateCategoryDialog({ open, onOpenChange, ...props }: CreateCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>
            Las categorías tienen dos niveles: una categoría principal y sus subcategorías.
          </DialogDescription>
        </DialogHeader>
        <CreateCategoryForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CreateCategoryForm({
  categories,
  initialKind,
  initialParentId,
  onDone,
}: Omit<CreateCategoryDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const createCategory = useCreateCategory()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const kindId = useId()
  const parentId = useId()
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { kind: initialKind, name: "", parentId: initialParentId ?? "" },
  })
  const kind = useWatch({ control: form.control, name: "kind" })
  const parents = categories.filter((category) => category.kind === kind && !category.archived)

  const onSubmit = form.handleSubmit((values) => {
    setGeneralError(null)
    createCategory.mutate(
      { kind: values.kind, name: values.name, parentId: values.parentId || undefined },
      {
        onSuccess: () => {
          toast.success("Categoría creada.")
          onDone()
        },
        onError: (error) => {
          if (!setServerErrors(error, form.setError, FIELDS, FIELD_BY_CODE)) {
            setGeneralError(error.message)
          }
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FieldGroup>
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={kindId}>Tipo</FieldLabel>
              <NativeSelect
                {...field}
                id={kindId}
                onChange={(event) => {
                  field.onChange(event)
                  form.setValue("parentId", "")
                }}
              >
                {(["EXPENSE", "INCOME"] as const).map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {CATEGORY_KIND_LABELS[option]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />
        <FormTextField control={form.control} name="name" label="Nombre" />
        <Controller
          control={form.control}
          name="parentId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={parentId}>Categoría principal</FieldLabel>
              <NativeSelect {...field} id={parentId} aria-invalid={fieldState.invalid}>
                <NativeSelectOption value="">
                  Ninguna: es una categoría principal
                </NativeSelectOption>
                {parents.map((category) => (
                  <NativeSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={createCategory.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={createCategory.isPending}>
          {createCategory.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Crear categoría
        </Button>
      </DialogFooter>
    </form>
  )
}

interface RenameCategoryDialogProps {
  category: Category | null
  onOpenChange: (open: boolean) => void
}

export function RenameCategoryDialog({ category, onOpenChange }: RenameCategoryDialogProps) {
  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renombrar categoría</DialogTitle>
          <DialogDescription>El tipo y la categoría principal no cambian.</DialogDescription>
        </DialogHeader>
        {category && <RenameCategoryForm category={category} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function RenameCategoryForm({ category, onDone }: { category: Category; onDone: () => void }) {
  const renameCategory = useRenameCategory()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { kind: category.kind, name: category.name, parentId: "" },
  })

  const onSubmit = form.handleSubmit(({ name }) => {
    setGeneralError(null)
    renameCategory.mutate(
      { id: category.id, name },
      {
        onSuccess: () => {
          toast.success("Categoría renombrada.")
          onDone()
        },
        onError: (error) => {
          if (!setServerErrors(error, form.setError, FIELDS, FIELD_BY_CODE)) {
            setGeneralError(error.message)
          }
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={generalError} />
      <FormTextField control={form.control} name="name" label="Nombre" />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={renameCategory.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={renameCategory.isPending}>
          {renameCategory.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

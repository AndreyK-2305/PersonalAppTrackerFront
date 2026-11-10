import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import type { Profile } from "@/features/auth/api/auth"
import { useUpdateProfile } from "../hooks/use-profile"
import { ownerNamesSchema, type OwnerNamesValues } from "../schemas"

/**
 * Nombres y apellidos legales, distintos del nombre visible. La captura los usa para reconocer una
 * transferencia a ti mismo cuando el destinatario tiene tu nombre (ADR-0017).
 */
export function OwnerNamesForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()
  const form = useForm<OwnerNamesValues>({
    resolver: zodResolver(ownerNamesSchema),
    values: { givenNames: profile.givenNames ?? "", surnames: profile.surnames ?? "" },
  })

  // Un campo vacío se envía vacío para que el backend lo borre.
  const onSubmit = form.handleSubmit((values) =>
    updateProfile.mutate(values, { onSuccess: () => toast.success("Nombres guardados.") }),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus nombres en los bancos</CardTitle>
        <CardDescription>
          Si una transferencia va a alguien con al menos uno de tus nombres y uno de tus apellidos,
          la app te preguntará si fue a una cuenta tuya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <FormError message={updateProfile.error?.message} />
          <FieldGroup>
            <FormTextField
              control={form.control}
              name="givenNames"
              label="Nombres"
              autoComplete="given-name"
              placeholder="Como aparecen en tus cuentas"
            />
            <FormTextField
              control={form.control}
              name="surnames"
              label="Apellidos"
              autoComplete="family-name"
            />
          </FieldGroup>
          <Button type="submit" disabled={updateProfile.isPending || !form.formState.isDirty}>
            {updateProfile.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            Guardar nombres
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

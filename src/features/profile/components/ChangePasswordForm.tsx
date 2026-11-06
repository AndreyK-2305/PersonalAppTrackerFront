import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/features/auth/schemas"
import { ApiError } from "@/lib/http"
import { useChangePassword } from "../hooks/use-profile"
import { changePasswordSchema, type ChangePasswordValues } from "../schemas"

// Errores del backend que corresponden a un campo concreto del formulario.
const FIELD_BY_ERROR_CODE: Record<string, keyof ChangePasswordValues> = {
  "identity.current_password_incorrect": "currentPassword",
  "identity.password_policy": "newPassword",
}

export function ChangePasswordForm() {
  const changePassword = useChangePassword()
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  })

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword }) =>
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset()
          toast.success("Contraseña actualizada. Cerramos tus sesiones en otros dispositivos.")
        },
        onError: (error) => {
          const field = error instanceof ApiError ? FIELD_BY_ERROR_CODE[error.code] : undefined
          if (field) {
            form.setError(field, { message: error.message })
          }
        },
      },
    ),
  )

  const error = changePassword.error
  const generalError =
    error instanceof ApiError && FIELD_BY_ERROR_CODE[error.code] ? null : error?.message

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>
          Al cambiarla se cierran las sesiones abiertas en tus otros dispositivos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <FormError message={generalError} />
          <FieldGroup>
            <FormTextField
              control={form.control}
              name="currentPassword"
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
            />
            <FormTextField
              control={form.control}
              name="newPassword"
              label="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              description={`Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`}
            />
            <FormTextField
              control={form.control}
              name="confirmNewPassword"
              label="Confirmar contraseña nueva"
              type="password"
              autoComplete="new-password"
            />
          </FieldGroup>
          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            Cambiar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

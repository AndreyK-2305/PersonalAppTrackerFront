import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { LoaderCircleIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { registrationStatusQueryOptions } from "../api/auth"
import { useLogin } from "../hooks/use-auth"
import { loginSchema, type LoginValues } from "../schemas"

/** Al iniciar sesión, PublicOnlyRoute lleva al usuario a la página que había solicitado. */
export function LoginPage() {
  const login = useLogin()
  const registration = useQuery(registrationStatusQueryOptions)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit((values) => login.mutate(values))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>Ingresa con tu correo electrónico y tu contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <FormError message={login.error?.message} />
          <FieldGroup>
            <FormTextField
              control={form.control}
              name="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
            />
            <FormTextField
              control={form.control}
              name="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
            />
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            Iniciar sesión
          </Button>
        </form>
      </CardContent>
      {registration.data?.enabled && (
        <CardFooter className="justify-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?&nbsp;
          <Link to="/registro" className="font-medium text-foreground underline underline-offset-4">
            Crear una cuenta
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}

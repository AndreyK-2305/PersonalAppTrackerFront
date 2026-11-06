import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { LoaderCircleIcon, LockIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
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
import { Skeleton } from "@/components/ui/skeleton"
import { registrationStatusQueryOptions } from "../api/auth"
import { useRegister } from "../hooks/use-auth"
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  registerSchema,
  type RegisterValues,
} from "../schemas"

/** Registro de cuentas. Solo está disponible si el backend lo habilita (REGISTRATION_ENABLED). */
export function RegisterPage() {
  const registration = useQuery(registrationStatusQueryOptions)

  if (registration.isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }
  if (!registration.data?.enabled) {
    return (
      <Card>
        <ErrorState
          icon={LockIcon}
          title="El registro está cerrado"
          description="Por ahora no es posible crear cuentas nuevas."
          action={
            <Button asChild variant="outline">
              <Link to="/iniciar-sesion">Ir a iniciar sesión</Link>
            </Button>
          }
        />
      </Card>
    )
  }
  return <RegisterForm />
}

function RegisterForm() {
  const register = useRegister()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  })

  const onSubmit = form.handleSubmit(({ displayName, email, password }) =>
    register.mutate({ displayName, email, password }),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Crear una cuenta</CardTitle>
        <CardDescription>Tu información financiera solo será visible para ti.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <FormError message={register.error?.message} />
          <FieldGroup>
            <FormTextField
              control={form.control}
              name="displayName"
              label="Nombre"
              autoComplete="name"
            />
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
              autoComplete="new-password"
              description={`Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres. Una frase fácil de recordar funciona bien.`}
            />
            <FormTextField
              control={form.control}
              name="confirmPassword"
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
            />
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            Crear cuenta
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?&nbsp;
        <Link
          to="/iniciar-sesion"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Iniciar sesión
        </Link>
      </CardFooter>
    </Card>
  )
}

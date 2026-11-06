import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircleIcon } from "lucide-react"
import { useId, useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"
import type { Profile } from "@/features/auth/api/auth"
import { formatDateTime } from "@/lib/format"
import { useUpdateProfile } from "../hooks/use-profile"
import { profileSchema, type ProfileValues } from "../schemas"
import { groupedTimeZones, timeZoneLabel } from "../time-zones"

export function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()
  const timeZoneId = useId()
  const timeZones = useMemo(() => groupedTimeZones(profile.timeZone), [profile.timeZone])
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { displayName: profile.displayName, timeZone: profile.timeZone },
  })

  const onSubmit = form.handleSubmit((values) =>
    updateProfile.mutate(values, { onSuccess: () => toast.success("Perfil actualizado.") }),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>{profile.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <FormError message={updateProfile.error?.message} />
          <FieldGroup>
            <FormTextField
              control={form.control}
              name="displayName"
              label="Nombre"
              autoComplete="name"
            />
            <Controller
              control={form.control}
              name="timeZone"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={timeZoneId}>Zona horaria</FieldLabel>
                  <NativeSelect {...field} id={timeZoneId} aria-invalid={fieldState.invalid}>
                    {timeZones.map(([region, zones]) => (
                      <NativeSelectOptGroup key={region} label={region}>
                        {zones.map((zone) => (
                          <NativeSelectOption key={zone} value={zone}>
                            {timeZoneLabel(zone)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelectOptGroup>
                    ))}
                  </NativeSelect>
                  <FieldDescription>Define qué días y meses abarcan tus reportes.</FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Cuenta creada</dt>
              <dd className="font-medium">{formatDateTime(profile.createdAt, profile.timeZone)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Último inicio de sesión</dt>
              <dd className="font-medium">
                {profile.lastLoginAt ? formatDateTime(profile.lastLoginAt, profile.timeZone) : "—"}
              </dd>
            </div>
          </dl>
          <Button type="submit" disabled={updateProfile.isPending || !form.formState.isDirty}>
            {updateProfile.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            Guardar cambios
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

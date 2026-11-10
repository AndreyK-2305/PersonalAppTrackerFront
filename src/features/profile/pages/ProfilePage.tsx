import { PageHeader } from "@/components/common/PageHeader"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { OwnKeysCard } from "@/features/capture/components/OwnKeysCard"
import { ChangePasswordForm } from "../components/ChangePasswordForm"
import { OwnerNamesForm } from "../components/OwnerNamesForm"
import { ProfileForm } from "../components/ProfileForm"

export function ProfilePage() {
  const profile = useCurrentProfile()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Administra los datos de tu cuenta, tu contraseña y cómo se reconocen tus transferencias."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ProfileForm profile={profile} />
        <ChangePasswordForm />
      </div>
      <section className="space-y-3" aria-labelledby="own-transfers-title">
        <div className="space-y-1">
          <h2 id="own-transfers-title" className="text-lg font-semibold">
            Transferencias a ti mismo
          </h2>
          <p className="text-sm text-muted-foreground">
            Con estos datos, la captura automática distingue lo que mueves entre tus cuentas de lo
            que gastas.
          </p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <OwnerNamesForm profile={profile} />
          <OwnKeysCard />
        </div>
      </section>
    </div>
  )
}

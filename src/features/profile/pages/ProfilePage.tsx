import { PageHeader } from "@/components/common/PageHeader"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { ChangePasswordForm } from "../components/ChangePasswordForm"
import { ProfileForm } from "../components/ProfileForm"

export function ProfilePage() {
  const profile = useCurrentProfile()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Administra los datos de tu cuenta y tu contraseña."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ProfileForm profile={profile} />
        <ChangePasswordForm />
      </div>
    </div>
  )
}

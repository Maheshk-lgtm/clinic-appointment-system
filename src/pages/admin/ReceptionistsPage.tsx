import { UserManager } from './UserManager'

export function ReceptionistsPage() {
  return <UserManager title="Receptionists" allowedRoles={['receptionist']} fixedRole="receptionist" />
}

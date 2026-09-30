import { UserManager } from './UserManager'

export function UsersPage() {
  return <UserManager title="All users" allowedRoles={['admin', 'receptionist', 'doctor']} />
}

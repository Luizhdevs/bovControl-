export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
export type UserRole     = 'OWNER' | 'MANAGER' | 'WORKER' | 'VIEWER'

export type InviteWithCreator = {
  id:          string
  email:       string
  role:        UserRole
  status:      InviteStatus
  token:       string
  expiresAt:   Date
  usedAt:      Date | null
  createdAt:   Date
  createdBy:   { name: string }
}

export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string }

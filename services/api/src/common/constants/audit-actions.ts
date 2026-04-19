/**
 * Shared enum-like constants для AuditLog action field.
 * Используется через `AuditAction.X` вместо строковых литералов для
 * устранения typo bugs и облегчения рефакторинга.
 */

export const AuditAction = {
  // Auth
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  LOGOUT_ALL: 'LOGOUT_ALL',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  PASSWORD_RESET_FAILED: 'PASSWORD_RESET_FAILED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_VERIFY_FAILED: 'MFA_VERIFY_FAILED',
  MFA_BACKUP_CODE_USED: 'MFA_BACKUP_CODE_USED',

  // User management
  USER_UPDATE: 'USER_UPDATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',

  // GDPR
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_DELETION_REQUEST: 'DATA_DELETION_REQUEST',
  DATA_DELETION_CANCEL: 'DATA_DELETION_CANCEL',
  DATA_HARD_DELETE: 'DATA_HARD_DELETE',

  // Therapist
  PATIENT_ASSIGN: 'PATIENT_ASSIGN',
  PATIENT_DISCHARGE: 'PATIENT_DISCHARGE',
  NOTE_CREATE: 'NOTE_CREATE',

  // Crisis
  CRISIS_EVENT: 'CRISIS_EVENT',

  // Billing
  CHECKOUT_SESSION_CREATED: 'CHECKOUT_SESSION_CREATED',
  SUBSCRIPTION_SYNC: 'SUBSCRIPTION_SYNC',
} as const;

export type AuditActionKey = keyof typeof AuditAction;
export type AuditActionValue = (typeof AuditAction)[AuditActionKey];

export const CrisisSeverity = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type CrisisSeverityValue = (typeof CrisisSeverity)[keyof typeof CrisisSeverity];

export const CrisisType = {
  SUICIDE_IDEATION: 'SUICIDE_IDEATION',
  SELF_HARM: 'SELF_HARM',
  DISSOCIATION: 'DISSOCIATION',
  PANIC: 'PANIC',
  OTHER: 'OTHER',
} as const;

export type CrisisTypeValue = (typeof CrisisType)[keyof typeof CrisisType];

export const VerificationPurpose = {
  EMAIL_VERIFY: 'EMAIL_VERIFY',
  PHONE_VERIFY: 'PHONE_VERIFY',
  PASSWORD_RESET: 'PASSWORD_RESET',
  BACKUP_CODE: 'BACKUP_CODE',
} as const;

export type VerificationPurposeValue =
  (typeof VerificationPurpose)[keyof typeof VerificationPurpose];

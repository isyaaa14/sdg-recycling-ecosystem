export const ALLOWED_REGISTRATION_EMAIL_DOMAINS = ["student.uow.edu.my", "uow.edu.my"];

export function extractEmailDomain(email) {
  if (!email) return "";
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  return at === -1 ? "" : normalized.slice(at + 1);
}

export function isAllowedRegistrationEmailDomain(email) {
  return ALLOWED_REGISTRATION_EMAIL_DOMAINS.includes(extractEmailDomain(email));
}

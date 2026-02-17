export type ContactLike = {
  fullName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\d{3}-\d{3}-\d{4}$/;

function isNonEmpty(value: string | undefined) {
  return Boolean(value?.trim());
}

export function isValidEmailFormat(value: string | undefined) {
  const email = value?.trim() ?? "";
  if (!email) return false;
  return EMAIL_PATTERN.test(email);
}

export function isValidPhoneFormat(value: string | undefined) {
  const phone = value?.trim() ?? "";
  if (!phone) return false;
  return PHONE_PATTERN.test(phone);
}

export function formatPhoneAsUs(value: string | undefined) {
  const digitsOnly = (value ?? "").replace(/\D/g, "").slice(0, 10);
  if (digitsOnly.length <= 3) return digitsOnly;
  if (digitsOnly.length <= 6) return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
}

export function validateContact(contact: ContactLike) {
  const missing: string[] = [];
  const invalid: string[] = [];

  if (!isNonEmpty(contact.fullName)) missing.push("Full Name");
  if (!isNonEmpty(contact.companyName)) missing.push("Company Name");
  if (!isNonEmpty(contact.email)) missing.push("Email");
  if (!isNonEmpty(contact.phone)) missing.push("Phone");

  if (isNonEmpty(contact.email) && !isValidEmailFormat(contact.email)) invalid.push("Email");
  if (isNonEmpty(contact.phone) && !isValidPhoneFormat(contact.phone)) invalid.push("Phone");

  return {
    missing,
    invalid,
    isValid: missing.length === 0 && invalid.length === 0,
  };
}

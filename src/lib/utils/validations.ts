export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Eliminar todos los caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Solo verificar que tenga al menos 8 dígitos
  return cleaned.length >= 8;
}

export function isValidPassword(password: string): boolean {
  // Mínimo 8 caracteres, al menos una letra mayúscula, una minúscula y un número
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return passwordRegex.test(password);
}

export function isValidName(name: string): boolean {
  // Solo letras, espacios y acentos
  const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,}$/;
  return nameRegex.test(name);
}

export function isValidDate(date: string): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

export function isValidInquiryNumber(number: string): boolean {
  // Formato: INQ-YYMM-XXXX
  const inquiryRegex = /^INQ-\d{4}-\d{4}$/;
  return inquiryRegex.test(number);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function isValidPostalCode(code: string): boolean {
  // Código postal argentino: XXXX o AXXXXAAA
  const postalRegex = /^[A-Z]?\d{4}[A-Z]{0,3}$/;
  return postalRegex.test(code);
}

export function isValidDNI(dni: string): boolean {
  // DNI argentino: 7-8 dígitos
  const dniRegex = /^\d{7,8}$/;
  return dniRegex.test(dni);
}

export function isValidCUIT(cuit: string): boolean {
  // CUIT argentino: XX-XXXXXXXX-X
  const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;
  if (!cuitRegex.test(cuit)) {
    return false;
  }

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const cuitNumbers = cuit.replace(/-/g, '').split('').map(Number);
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += cuitNumbers[i] * multipliers[i];
  }
  
  const mod11 = 11 - (sum % 11);
  const checkDigit = mod11 === 11 ? 0 : mod11 === 10 ? 9 : mod11;
  
  return checkDigit === cuitNumbers[10];
} 
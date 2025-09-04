export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Normalizar caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
    .trim()
    .replace(/^-+|-+$/g, ''); // Remover guiones del inicio y final
}

export function generateBudgetSlug(contactName?: string, leadName?: string, budgetTitle?: string): string {
  const name = contactName || leadName || 'cliente';
  const title = budgetTitle || 'presupuesto';
  
  const nameSlug = generateSlug(name);
  const titleSlug = generateSlug(title);
  
  // Combinar nombre y título, limitando longitud
  const fullSlug = `${nameSlug}-${titleSlug}`;
  
  // Limitar a 60 caracteres para URLs amigables
  if (fullSlug.length > 60) {
    return fullSlug.substring(0, 60).replace(/-$/, '');
  }
  
  return fullSlug;
}

export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
/**
 * Masking Utilities for Brazilian Formats (CPF, CNPJ, Telefone/WhatsApp, CEP, Moeda)
 */

export function maskCpf(value: string): string {
  const clean = (value || '').replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCnpj(value: string): string {
  const clean = (value || '').replace(/\D/g, '').slice(0, 14);
  return clean
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskCpfCnpj(value: string): string {
  const clean = (value || '').replace(/\D/g, '');
  if (clean.length <= 11) {
    return maskCpf(clean);
  }
  return maskCnpj(clean);
}

export function maskPhone(value: string): string {
  const clean = (value || '').replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return clean
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskRg(value: string): string {
  const clean = (value || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 9);
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})([0-9A-Z])/, '$1.$2.$3-$4');
}

export function maskCep(value: string): string {
  const clean = (value || '').replace(/\D/g, '').slice(0, 8);
  return clean.replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCurrency(value: string | number): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
  const clean = (value || '').replace(/\D/g, '');
  if (!clean) return '';
  const num = parseFloat(clean) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

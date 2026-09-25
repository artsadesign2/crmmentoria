/**
 * Rate Limiter em Memória de Alta Performance (Zero Custo / Sem Redis)
 * Protege rotas sensíveis contra ataques de força bruta e abusos de requisições.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitRecord>();

// Limpeza periódica a cada 5 minutos para evitar vazamento de memória
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipMap.entries()) {
      if (now > record.resetAt) {
        ipMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit: number; // Máximo de requisições permitidas
  windowMs: number; // Janela de tempo em milissegundos
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 5, windowMs: 60 * 1000 }
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const record = ipMap.get(identifier);

  if (!record || now > record.resetAt) {
    ipMap.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: now + options.windowMs,
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    reset: record.resetAt,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

/**
 * Erros de autenticação e autorização.
 *
 * Carregam o status HTTP para que `withAuth` os converta em resposta sem que
 * cada rota precise repetir try/catch.
 */

export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor(message = 'Sessão inválida ou expirada.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;

  constructor(message = 'Você não tem permissão para esta ação.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function isAuthError(error: unknown): error is UnauthorizedError | ForbiddenError {
  return error instanceof UnauthorizedError || error instanceof ForbiddenError;
}

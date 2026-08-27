// Segredo determinístico para os testes. Nunca é usado fora do Vitest.
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? 'test-secret-com-pelo-menos-32-caracteres!!';

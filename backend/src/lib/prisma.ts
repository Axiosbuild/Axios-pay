type AnyRecord = Record<string, any>;

const makeCollection = () => ({
  findMany: async (_args?: AnyRecord) => [],
  findUnique: async (_args?: AnyRecord) => null,
  findFirst: async (_args?: AnyRecord) => null,
  count: async (_args?: AnyRecord) => 0,
  create: async (args?: AnyRecord) => ({ id: 'mock-id', ...(args?.data || {}) }),
  update: async (args?: AnyRecord) => ({ id: args?.where?.id || 'mock-id', ...(args?.data || {}) }),
  updateMany: async (_args?: AnyRecord) => ({ count: 1 }),
});

export const prisma = {
  user: makeCollection(),
  wallet: makeCollection(),
  kycDocument: makeCollection(),
  kycFacialCheck: makeCollection(),
  transaction: makeCollection(),
  webhookEvent: makeCollection(),
  $queryRaw: async (_query: TemplateStringsArray) => 1,
  $transaction: async (input: any) => {
    if (typeof input === 'function') return input(prisma);
    return Promise.all(input);
  },
};

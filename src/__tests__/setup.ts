jest.retryTimes(3, { logErrorsBeforeRetry: true });

afterAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');
  await prisma.$disconnect();
});

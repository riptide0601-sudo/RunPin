export default {
  test: {
    include: [process.env.SUITE || 'rules/**/*.test.mjs'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
};

export const queryDefaultOptions = {
  queries: {
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    retry: 1
  },
  mutations: {
    retry: false
  }
};

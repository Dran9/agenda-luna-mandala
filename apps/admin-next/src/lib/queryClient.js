import { QueryClient } from "@tanstack/react-query";

import { queryDefaultOptions } from "./queryDefaults";

export const queryClient = new QueryClient({
  defaultOptions: queryDefaultOptions
});

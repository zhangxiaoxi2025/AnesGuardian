import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method?: string,
  url?: string,
  data?: unknown | undefined,
): Promise<Response> {
  // 如果method未提供，智能设置默认值
  if (!method) {
    if (data) {
      method = 'POST';
    } else {
      method = 'GET';
    }
  }

  // 如果url未提供但method是字符串，可能是旧的调用方式
  if (!url && typeof method === 'string' && method.startsWith('/')) {
    url = method;
    method = 'GET';
  }

  if (!url) {
    throw new Error('URL is required');
  }

  // 检查数据是否为FormData
  const isFormData = data instanceof FormData;
  
  // 设置请求配置
  const requestOptions: RequestInit = {
    method,
    credentials: "include",
  };

  // 处理headers和body
  if (data) {
    if (isFormData) {
      // 对于FormData，不设置Content-Type，让浏览器自动设置boundary
      requestOptions.body = data as FormData;
    } else {
      // 对于JSON数据，设置Content-Type并stringify
      requestOptions.headers = { "Content-Type": "application/json" };
      requestOptions.body = JSON.stringify(data);
    }
  }

  console.log('🚀 apiRequest发送请求:', {
    method,
    url,
    isFormData,
    hasData: !!data,
    headers: requestOptions.headers
  });

  const res = await fetch(url, requestOptions);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

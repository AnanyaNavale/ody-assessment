import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const Axios = (axios as unknown as { default?: typeof axios }).default ?? axios;

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787",
});

export const httpClient = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data as T);

  // @ts-expect-error Axios cancel helper used by Orval-generated hooks
  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};

export type ErrorType<TError> = AxiosError<TError>;
export type BodyType<TBody> = TBody;

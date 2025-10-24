import { useEffect } from "react";
import type { InternalAxiosRequestConfig } from "axios";
import { axiosPrivate } from "../api/axios";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";
import type { AxiosRequestHeaders } from "axios";

const useAxiosPrivate = () => {
  const refresh = useRefreshToken();
  const { auth } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (!config.headers) {
          config.headers = {} as AxiosRequestHeaders;
        }
        if (!config.headers["Authorization"]) {
          config.headers["Authorization"] = `Bearer ${auth?.access}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        type RetryableRequest = InternalAxiosRequestConfig & {
          _retry?: boolean;
        };
        const prevRequest = error?.config as RetryableRequest | undefined;

        const status = error?.response?.status;
        if (
          prevRequest &&
          !prevRequest._retry &&
          (status === 401 || status === 403)
        ) {
          prevRequest._retry = true;
          try {
            const newAccessToken = await refresh();
            prevRequest.headers = {
              ...(prevRequest.headers ?? {}),
              Authorization: `Bearer ${newAccessToken}`,
            } as AxiosRequestHeaders;
            return axiosPrivate(prevRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [auth?.access, refresh]);

  return axiosPrivate;
};

export default useAxiosPrivate;

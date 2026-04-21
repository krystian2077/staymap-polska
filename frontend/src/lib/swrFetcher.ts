import { api } from "@/lib/api/client";

export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  return api.get<T>(url);
}

export async function authJsonFetcher<T = unknown>(url: string): Promise<T> {
  return api.get<T>(url);
}

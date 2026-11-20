import { navigate, usePath } from "./router";
export function useRouter() {
  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, true),
    refresh: () => {},
    back: () => history.back(),
    prefetch: () => {},
  };
}
export function usePathname() {
  return usePath().split("?")[0];
}
export function useSearchParams() {
  const q = usePath().split("?")[1] ?? "";
  return new URLSearchParams(q);
}

import { navigate, usePath } from "./router";
// Objet stable (comme le routeur de Next) : sinon les effets qui en dépendent se relancent à chaque rendu.
const router = {
  push: (to: string) => navigate(to),
  replace: (to: string) => navigate(to, true),
  refresh: () => {},
  back: () => history.back(),
  prefetch: () => {},
};
export function useRouter() {
  return router;
}
export function usePathname() {
  return usePath().split("?")[0];
}
export function useSearchParams() {
  const q = usePath().split("?")[1] ?? "";
  return new URLSearchParams(q);
}

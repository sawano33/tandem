import { createRoot } from "react-dom/client";
import { usePath } from "./shim/router";
import { DataProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import Login from "@/app/login/page";
import Home from "@/app/(app)/page";
import Depenses from "@/app/(app)/depenses/page";
import Stats from "@/app/(app)/stats/page";
import Budgets from "@/app/(app)/budgets/page";
import Profil from "@/app/(app)/profil/page";
import Moi from "@/app/(app)/profil/moi/page";
import Comptes from "@/app/(app)/profil/comptes/page";
import Categories from "@/app/(app)/profil/categories/page";
import Charges from "@/app/(app)/profil/charges/page";
import Partenaire from "@/app/(app)/profil/partenaire/page";
import Notifications from "@/app/(app)/profil/notifications/page";
import Repartition from "@/app/(app)/profil/repartition/page";

const ROUTES: Record<string, () => React.ReactNode> = {
  "/": Home, "/depenses": Depenses, "/stats": Stats, "/budgets": Budgets, "/profil": Profil,
  "/profil/moi": Moi, "/profil/comptes": Comptes, "/profil/categories": Categories,
  "/profil/charges": Charges, "/profil/partenaire": Partenaire, "/profil/notifications": Notifications, "/profil/repartition": Repartition,
};

function App() {
  const path = usePath().split("?")[0];
  if (path === "/login" || path === "/onboarding") return <Login />;
  const Page = ROUTES[path] ?? Home;
  return (
    <DataProvider key="app">
      <AppShell>
        <Page />
      </AppShell>
    </DataProvider>
  );
}

document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(<App />);

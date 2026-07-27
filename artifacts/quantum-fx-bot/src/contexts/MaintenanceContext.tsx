import { createContext, useContext, ReactNode } from "react";
import { useGetAppStatus } from "@workspace/api-client-react";

interface MaintenanceContextType {
  maintenanceMode: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType>({ maintenanceMode: false });

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const { data } = useGetAppStatus({
    query: {
      refetchInterval: 30_000,   // poll every 30 s
      refetchIntervalInBackground: true,
      retry: false,
      staleTime: 0,
    } as any,
  });

  return (
    <MaintenanceContext.Provider value={{ maintenanceMode: data?.maintenanceMode ?? false }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

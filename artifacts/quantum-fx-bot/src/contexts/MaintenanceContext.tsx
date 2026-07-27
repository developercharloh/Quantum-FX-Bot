import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface MaintenanceContextType {
  maintenanceMode: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType>({ maintenanceMode: false });

async function fetchMaintenanceMode(): Promise<boolean> {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return false;
    const data = await res.json();
    return data?.maintenanceMode === true;
  } catch {
    return false;
  }
}

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    // Fetch immediately on mount
    fetchMaintenanceMode().then(setMaintenanceMode);

    // Then poll every 15 seconds
    const id = setInterval(() => {
      fetchMaintenanceMode().then(setMaintenanceMode);
    }, 15_000);

    return () => clearInterval(id);
  }, []);

  return (
    <MaintenanceContext.Provider value={{ maintenanceMode }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

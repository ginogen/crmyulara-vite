import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Definir interfaces para organizaciones y sucursales
interface Organization {
  id: string;
  name: string;
  description?: string;
  status?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface Branch {
  id: string;
  name: string;
  organization_id: string;
  description?: string;
  status?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
}

// Definir el tipo DBUser para usuarios de la base de datos
type DBUser = User & {
  role?: string;
  user_metadata?: {
    name?: string;
  };
};

interface AuthContextType {
  user: DBUser | null;
  loading: boolean;
  currentOrganization: Organization | null;
  currentBranch: Branch | null;
  organizations: Organization[];
  branches: Branch[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
  setCurrentBranch: (branch: Branch) => void;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Estados para organizaciones y sucursales
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  
  const supabase = createClient();

  // Cargar datos reales de Supabase cuando el usuario está autenticado
  useEffect(() => {
    if (user) {
      const loadRealData = async () => {
        try {
          setLoading(true);
          
          // 1. Cargar organizaciones desde Supabase
          const { data: orgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name, description, status, contact_name, contact_email, contact_phone')
            .eq('status', 'active')
            .order('name');
            
          if (orgsError) {
            throw orgsError;
          }
          
          // 2. Cargar sucursales desde Supabase
          const { data: branchesData, error: branchesError } = await supabase
            .from('branches')
            .select('id, name, organization_id, description, status, address, city, province, phone, email')
            .eq('status', 'active')
            .order('name');
            
          if (branchesError) {
            throw branchesError;
          }
          
          // 3. Determinar el rol del usuario (en un entorno real, esto vendría de la base de datos)
          // Para esta demo, asignamos super_admin
          setUserRole('super_admin');
          
          console.log('Datos cargados de Supabase:', {
            organizaciones: orgsData.length,
            sucursales: branchesData.length
          });
          
          // 4. Almacenar los datos
          setOrganizations(orgsData);
          setBranches(branchesData);
          
          // 5. Establecer organización y sucursal por defecto si existen datos
          if (orgsData.length > 0 && !currentOrganization) {
            const defaultOrg = orgsData[0];
            setCurrentOrganization(defaultOrg);
            
            // Buscar la primera sucursal de esta organización
            const defaultBranch = branchesData.find(b => b.organization_id === defaultOrg.id);
            if (defaultBranch) {
              setCurrentBranch(defaultBranch);
            }
          }
          
        } catch (error) {
          console.error("Error al cargar datos de Supabase:", error);
        } finally {
          setLoading(false);
        }
      };
      
      // Cargar datos reales
      loadRealData();
    }
  }, [user, supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user as DBUser ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Limpiar estados al cerrar sesión
    setCurrentOrganization(null);
    setCurrentBranch(null);
    setOrganizations([]);
    setBranches([]);
    setUserRole(null);
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  // Función para cambiar organización actual
  const handleSetCurrentOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    
    // Al cambiar la organización, actualizar también la sucursal
    const firstBranchOfOrg = branches.find(branch => branch.organization_id === org.id);
    if (firstBranchOfOrg) {
      setCurrentBranch(firstBranchOfOrg);
    } else {
      setCurrentBranch(null); // Si no hay sucursales para esta organización
    }
  };

  // Función para cambiar sucursal actual
  const handleSetCurrentBranch = (branch: Branch) => {
    setCurrentBranch(branch);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut, 
      signUp,
      userRole,
      organizations,
      branches,
      currentOrganization,
      currentBranch,
      setCurrentOrganization: handleSetCurrentOrganization,
      setCurrentBranch: handleSetCurrentBranch
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
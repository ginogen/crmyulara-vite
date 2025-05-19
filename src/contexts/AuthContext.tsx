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
type UserRole = 'super_admin' | 'org_admin' | 'branch_manager' | 'sales_agent';

type DBUser = User & {
  role?: UserRole;
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
  userRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
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
          
          // 1. Obtener los datos del usuario incluyendo su organización y sucursal
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
              role,
              organization_id,
              branch_id
            `)
            .eq('id', user.id)
            .single();
            
          if (userError) {
            console.error('Error al obtener datos del usuario:', userError);
            throw userError;
          }

          console.log('Datos del usuario obtenidos:', userData);
          console.log('ID del usuario:', user.id);
          
          if (userData?.role) {
            console.log('Estableciendo rol del usuario:', userData.role);
            setUserRole(userData.role);
          } else {
            console.warn('No se encontró rol para el usuario');
            setUserRole('sales_agent'); // Rol por defecto
          }
          
          // 2. Cargar organizaciones desde Supabase
          const { data: orgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name, description, status, contact_name, contact_email, contact_phone')
            .eq('status', 'active')
            .order('name');
            
          if (orgsError) {
            throw orgsError;
          }
          
          // 3. Cargar sucursales desde Supabase
          const { data: branchesData, error: branchesError } = await supabase
            .from('branches')
            .select('id, name, organization_id, description, status, address, city, province, phone, email')
            .eq('status', 'active')
            .order('name');
            
          if (branchesError) {
            throw branchesError;
          }
          
          console.log('Datos cargados de Supabase:', {
            organizaciones: orgsData.length,
            sucursales: branchesData.length
          });
          
          // 4. Almacenar los datos
          setOrganizations(orgsData);
          setBranches(branchesData);
          
          // 5. Establecer la organización y sucursal asignada al usuario
          if (userData.organization_id) {
            const userOrg = orgsData.find(org => org.id === userData.organization_id);
            if (userOrg) {
              setCurrentOrganization(userOrg);
              
              // Si el usuario tiene una sucursal asignada, establecerla
              if (userData.branch_id) {
                const userBranch = branchesData.find(b => b.id === userData.branch_id);
                if (userBranch) {
                  setCurrentBranch(userBranch);
                }
              } else {
                // Si no tiene sucursal asignada, establecer la primera de su organización
                const firstBranch = branchesData.find(b => b.organization_id === userOrg.id);
                if (firstBranch) {
                  setCurrentBranch(firstBranch);
                }
              }
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session: any) => {
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
    const firstBranchOfOrg = branches.find((branch: Branch) => branch.organization_id === org.id);
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
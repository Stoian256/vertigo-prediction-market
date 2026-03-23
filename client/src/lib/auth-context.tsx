import { createContext, useContext, useEffect, useState } from "react";
import { User, api } from "./api"; // Asigură-te că importul api este corect

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
    updateBalance: (newBalance: number) => void;// Nou: pentru a actualiza balanța după pariu
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Funcție nouă pentru a prelua datele proaspete ale utilizatorului (balanța)
  const refreshUser = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    try {
      // Presupunem că avem un endpoint /me sau refolosim login-ul
      // Pentru simplitate în acest test, dacă backend-ul nu are /me,
      // vom actualiza balanța manual în UI sau prin re-fetch.
    } catch (err) {
      console.error("Could not refresh user data", err);
    }
  };
    const updateBalance = (newBalance: number) => {
        setUser((prevUser) => {
            if (!prevUser) return null;
            const updatedUser = { ...prevUser, balance: newBalance };

            // ADAUGĂ `role` AICI:
            localStorage.setItem("auth_user", JSON.stringify({
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                balance: updatedUser.balance,
                role: updatedUser.role // <--- Am adăugat linia asta
            }));

            return updatedUser;
        });
    };
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Adăugăm token-ul la obiectul user
        setUser({ ...parsedUser, token });
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    setIsLoading(false);
  }, []);

    const login = (newUser: User) => {
        setUser(newUser);
        localStorage.setItem("auth_token", newUser.token);

        // ADAUGĂ `role` AICI:
        localStorage.setItem("auth_user", JSON.stringify({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            balance: newUser.balance,
            role: newUser.role // <--- Am adăugat linia asta
        }));
    };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  return (
      <AuthContext.Provider
          value={{
            user,
            isLoading,
            login,
            logout,
            updateBalance,
            isAuthenticated: !!user,
          }}
      >
        {children}
      </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
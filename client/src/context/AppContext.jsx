import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AppContext = createContext(undefined);

export function AppContextProvider({ children }) {
  const navigate = useNavigate();

  // Auth States
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Auth Actions
  const checkSession = async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setUser(data.user);
      toast.success("Welcome Back");
      navigate("/");
    } catch (err) {
      console.log("Login Failed", err);
      const errMSg =
        err?.response?.data?.message || "Invalid email or password";
      toast.error(errMSg);
      throw new Error(errMSg);
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/api/auth/register", {
        name,
        email,
        password,
      });
      setUser(data.user);
      toast.success("New User Registered");
      navigate("/");
    } catch (err) {
      console.log("Register Failed", err);
      const errMSg = err?.response?.data?.message || "Registration Failed";
      toast.error(errMSg);
      throw new Error(errMSg);
    }
  };

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        login,
        register,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within a AppContextProvider");
  }
  return context;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";

const AppContext = createContext(undefined);

export function AppContextProvider({ children }) {
  const navigate = useNavigate();

  // Auth States
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  //States
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeProject, setActiveProject] = useState(null);
  const [loadingActiveProject, setLoadingActiveProject] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingProject, setGeneratingProject] = useState(false);
  const [activeFile, setActiveFile] = useState("/App.js");
  const [showCode, setShowCode] = useState(false);

  // Auth Actions
  // FIX: wrapped in useCallback with a stable (empty) dependency array so the
  // reference doesn't change every render — this is what caused the infinite
  // checkSession -> setState -> re-render -> new checkSession -> effect loop.
  const checkSession = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

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

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
      setUser(null);
      setProjects([]);
      setActiveProject(null);
      toast.success("You have been logged out");
      navigate("/login");
    } catch (err) {
      console.log("Logout Failed", err);
      toast.error("Logout Failed");
    }
  };

  // Project Actions
  // FIX: wrapped in useCallback so consumers/effects get a stable reference.
  const loadProjects = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/api/projects");
      setProjects(data);
    } catch (err) {
      console.log("Failed to list projects:", err);
      toast.error("Failed to list Projects");
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  // FIX: wrapped in useCallback (stable reference for the polling effect below)
  // and fixed two bugs inside: Object.Keys -> Object.keys, and the "/App.js"
  // vs "App.js" mismatch.
  const loadProject = useCallback(
    async (id, silent = false) => {
      if (!user) return;
      if (!silent) setLoadingActiveProject(true);
      try {
        const { data } = await api.get(`/api/projects/${id}`);
        setActiveProject(data);

        //Default file Selection
        const files = Object.keys(data.files);
        if (files.length > 0) {
          setActiveFile((prev) => {
            if (files.includes(prev)) return prev;
            if (files.includes("/App.js")) return "/App.js";
            return files[0];
          });
        }
      } catch (err) {
        console.log("Failed to load projects:", err);
        if (!silent) {
          toast.error("Failed to Load Projects Details");
          navigate("/");
        }
      } finally {
        if (!silent) setLoadingActiveProject(false);
      }
    },
    [user, navigate],
  );

  // Automaticlly pull active project status if generating or pending
  useEffect(() => {
    if (!activeProject?._id || !user) return;
    const isOngoing =
      activeProject.status === "generating" ||
      activeProject.status === "pending" ||
      activeProject.status === "revising";
    if (isOngoing) {
      setChatLoading(true);
      const interval = setInterval(() => {
        loadProject(activeProject._id, true);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setChatLoading(false);
    }
  }, [activeProject?._id, activeProject?.status, loadProject, user]);

  const handleGenerate = useCallback(
    async (prompt) => {
      if (!user) return;
      setGeneratingProject(true);
      try {
        const { data } = await api.post("/api/projects", { prompt });
        toast.success("Ai Agent is planning your website structure...");
        navigate(`/builder/${data._id}`);
      } catch (err) {
        console.log("Failed to generate project:", err);
        toast.error(
          err?.response?.data?.message || "Failed to generate project",
        );
      } finally {
        setGeneratingProject(false);
      }
    },
    [navigate, user],
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!user) return;
      try {
        await api.delete(`/api/projects/${id}`);
        // FIX: was `setProjects((prev = prev.filter(...)))`, a broken default
        // parameter expression that threw "Cannot access 'prev' before
        // initialization". This is the correct functional updater form.
        setProjects((prev) => prev.filter((p) => p._id !== id));
        toast.success("Project Deleted");
      } catch (err) {
        console.log("Failed to delete project:", err);
        toast.error("Failed to delete project");
      }
    },
    [user],
  );

  const handleChat = useCallback(
    async (prompt) => {
      if (!activeProject || !user) return;
      setChatLoading(true);
      try {
        const { data } = await api.post(
          `/api/projects/${activeProject._id}/chat`,
          { prompt },
        );
        setActiveProject(data);
        if (data.error && data.error.length > 0) {
          toast.error(`${data.error.length} revision patch(es) failed`);
        } else {
          toast.success(`Updated to Version ${data.version}`);
        }
      } catch (err) {
        console.error("Revision Failed", err);
        toast.error(err?.response?.data?.error || "Revision Failed");
      } finally {
        setChatLoading(false);
      }
    },
    [activeProject, user],
  );

  const debouncedSave = useMemo(
    () =>
      debounce(async (files, id) => {
        try {
          await api.put(`/api/projects/${id}/files`, { files });
        } catch (err) {
          console.error("Failed to Autosave Project Files", err);
          toast.error("Failed to Autosave Project Files");
        }
      }, 1000),
    [],
  );

  const updateProjectFiles = useCallback(
    async (files) => {
      if (!activeProject || !user) return;
      debouncedSave(files, activeProject._id);
    },
    [activeProject, user, debouncedSave],
  );

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        login,
        register,
        projects,
        loadingProjects,
        activeProject,
        loadingActiveProject,
        chatLoading,
        generatingProject,
        activeFile,
        showCode,
        setActiveFile,
        setShowCode,
        loadProjects,
        loadProject,
        handleGenerate,
        handleDelete,
        logout,
        handleChat,
        updateProjectFiles,
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

import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProject,
  getPublicProject,
  listProjects,
  publishProject,
  updateProjectFiles,
} from "../controllers/projectController.js";
import { authMiddleware } from "../middlewares/AuthMiddleware.js";
import { chat } from "../controllers/chatControllers.js";

const projectRouter = Router();

// public routes
projectRouter.get("public/:id", getPublicProject);

// protected routes
projectRouter.use(authMiddleware);

projectRouter.post("/", createProject);
projectRouter.get("/", listProjects);
projectRouter.get("/:id", getProject);
projectRouter.delete("/:id", deleteProject);
projectRouter.put("/:id/files", updateProjectFiles);
projectRouter.post("/:id/publish", publishProject);

// chat routes
projectRouter.post("/:id/chat", chat);

export default projectRouter;

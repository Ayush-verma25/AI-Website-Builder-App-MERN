import { Router } from "express";
import { createProject, deleteProject, getProject, getPublicProject, listProjects, publishProject, updateProjectFiles } from "../controllers/projectController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { chat } from "../controllers/chatController.js";

const projectRouter = Router();

// Public Route
projectRouter.get("/public/:id", getPublicProject)

// Protect all following routes
projectRouter.use(authMiddleware)

projectRouter.post("/", createProject)
projectRouter.get("/", listProjects)
projectRouter.get("/:id", getProject)
projectRouter.delete("/:id", deleteProject)
projectRouter.put("/:id/files", updateProjectFiles)
projectRouter.post("/:id/publish", publishProject)

// Chat
projectRouter.post("/:id/chat", chat)

export default projectRouter;
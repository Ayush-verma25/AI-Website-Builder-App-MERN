import { Project } from "../models/Project.js";
import crypto from "crypto";
import { generateProject } from "../services/ai.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function hashContent(content) {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 12);
}

// Background worker (Keep internal try/catch as it runs outside the Express lifecycle)
async function runBackgroundGeneration(projectId, prompt) {
    try {
        // [Assuming a proper logger is used here in production instead of console.log]
        console.info(`[Background AI] Starting generation for project ${projectId}`);
        const result = await generateProject(prompt, {
            onPlan: async (plan) => {
                const fileList = plan.files.map((f) => `- \`${f.path}\`: ${f.description}`).join("\n");
                await Project.findByIdAndUpdate(projectId, {
                    name: plan.projectName || "Generated Project",
                    status: "generating",
                    filesPlanned: plan.files,
                    $push: {
                        messages: {
                            role: "assistant",
                            content: `Planned website structure:\n${fileList}`,
                            timestamp: new Date(),
                        }
                    }
                });
            },
            onFileStart: async (path) => {
                await Project.findByIdAndUpdate(projectId, { currentFile: path });
            },
            onFileComplete: async (path, code) => {
                const project = await Project.findById(projectId);
                if (project) {
                    project.files = project.files || {};
                    project.files[path] = { content: code, hash: hashContent(code) };
                    project.filesGenerated = [...(project.filesGenerated || []), path];
                    project.messages.push({
                        role: "assistant",
                        content: `Created file "${path}"`,
                        timestamp: new Date(),
                    });
                    project.currentFile = null;
                    project.markModified("files");
                    await project.save();
                }
            }
        });

        const project = await Project.findById(projectId);
        if (project) {
            project.status = "completed";
            project.version = 1;
            if (result.description) project.name = result.description;
            
            project.messages.push({
                role: "assistant",
                content: `Website generation complete! You can view and edit the files.`,
                timestamp: new Date(),
            });
            await project.save();
        }
    } catch (err) {
        console.error(`[Background AI] Fatal generation error for project ${projectId}:`, err);
        await Project.findByIdAndUpdate(projectId, {
            status: "failed",
            error: err.message,
            $push: {
                messages: {
                    role: "assistant",
                    content: `❌ Generation failed: ${err.message}`,
                    timestamp: new Date(),
                }
            }
        });
    }
}

// POST /api/projects
export const createProject = asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "prompt is required" });
    }

    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const project = await Project.create({
        name: "Planning project...",
        description: prompt,
        files: {},
        messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: 'Planning project structure...' },
        ],
        version: 0,
        owner: req.user.userId,
        status: "pending",
        filesPlanned: [],
        filesGenerated: [],
        currentFile: null,
        error: null,
    });

    // Start background generation without awaiting
    runBackgroundGeneration(project._id.toString(), prompt).catch((err) => {
        console.error(`[Background AI] Failed to initiate for ${project._id}:`, err);
    });

    res.status(201).json({
        _id: project._id,
        name: project.name,
        description: project.description,
        files: {},
        messages: project.messages,
        version: project.version,
        status: project.status,
        filesPlanned: project.filesPlanned,
        filesGenerated: project.filesGenerated,
        currentFile: project.currentFile,
        error: project.error,
        createdAt: project.createdAt,
    });
});

// GET /api/projects
export const listProjects = asyncHandler(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const projects = await Project.find(
        { owner: req.user.userId },
        { name: 1, description: 1, version: 1, createdAt: 1, updatedAt: 1 }
    ).sort({ updatedAt: -1 });

    res.json(projects);
});

// GET /api/projects/:id
export const getProject = asyncHandler(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const filesObj = {};
    for (const [path, entry] of Object.entries(project.files || {})) {
        filesObj[path] = entry.content;
    }

    res.json({
        ...project.toObject(),
        files: filesObj
    });
});

// DELETE /api/projects/:id
export const deleteProject = asyncHandler(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const result = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
    if (!result) return res.status(404).json({ error: "Project not found" });

    res.json({ success: true });
});

// PUT /api/projects/:id/files
export const updateProjectFiles = asyncHandler(async (req, res) => {
    const { files } = req.body;
    
    if (!files || typeof files !== 'object') {
        return res.status(400).json({ error: "files object is required" });
    }

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const newFiles = {};
    for (const [path, content] of Object.entries(files)) {
        if (typeof content === "string") {
            newFiles[path] = { content, hash: hashContent(content) };
        }
    }

    project.files = newFiles;
    await project.save();

    const filesObj = {};
    for (const [path, entry] of Object.entries(project.files)) {
        filesObj[path] = entry.content;
    }

    res.json({
        ...project.toObject(),
        files: filesObj
    });
});

// POST /api/projects/:id/publish
export const publishProject = asyncHandler(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const project = await Project.findOneAndUpdate(
        { _id: req.params.id, owner: req.user.userId },
        { published: true },
        { returnDocument: "after" }
    );

    if (!project) return res.status(404).json({ error: "Project not found" });

    res.json({ success: true, published: project.published });
});

// GET /api/projects/public/:id
export const getPublicProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!project.published) return res.status(403).json({ error: "Project is not published yet" });

    const filesObj = {};
    for (const [path, entry] of Object.entries(project.files || {})) {
        filesObj[path] = entry.content;
    }

    res.json({
        _id: project._id,
        name: project.name,
        description: project.description,
        files: filesObj,
        version: project.version,
    });
});

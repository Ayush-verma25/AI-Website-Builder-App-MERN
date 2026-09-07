import { Project } from "../models/Project.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { generateProject } from "../services/ai.js";

function hashContent(content) {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 12);
}

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

export async function createProject(req, res, next) {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const project = await Project.create({
            name: "Planning project...",
            description: prompt,
            files: {},
            messages: [
                { role: "user", content: prompt },
                { role: "assistant", content: "Planning project structure..." },
            ],
            version: 0,
            owner: req.user.userId,
            status: "pending",
            filesPlanned: [],
            filesGenerated: [],
            currentFile: null,
            error: null,
        });

        runBackgroundGeneration(project._id.toString(), prompt).catch((err) => {
            console.error(`[Background AI] Unhandled error for project ${project._id}:`, err);
        });

        return res.status(201).json({
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
    } catch (error) {
        next(error);
    }
}

async function runBackgroundGeneration(projectId, prompt) {
    try {
        console.log(`[Background AI] Starting generation for project ${projectId}`);
        const result = await generateProject(prompt, {
            onPlan: async (plan) => {
                const filesList = plan?.files || [];
                console.log(`[Background AI] Plan created for project ${projectId}. Planned ${filesList.length} files.`);
                const fileList = filesList.map((f) => `- \`${f.path}\`: ${f.description}`).join("\n");

                await Project.findByIdAndUpdate(projectId, {
                    name: plan?.projectName || "Generated Project",
                    status: "generating",
                    filesPlanned: filesList,
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
                console.log(`[Background AI] Starting file ${path} for project ${projectId}`);
                await Project.findByIdAndUpdate(projectId, { currentFile: path });
            },
            onFileComplete: async (path, code) => {
                console.log(`[Background AI] Finished file ${path} for project ${projectId}`);
                const project = await Project.findById(projectId);

                if (project) {
                    project.files = project.files || {};
                    project.files[path] = { content: code, hash: hashContent(code) };
                    project.filesGenerated = Array.from(new Set([...(project.filesGenerated || []), path]));
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

        console.log(`[Background AI] Successfully generated project ${projectId}`);

        const project = await Project.findById(projectId);
        if (project) {
            project.status = "completed";
            project.version = 1;
            if (result && result.description) {
                project.name = result.description;
            }
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
            error: err.message || "Generation error",
            $push: {
                messages: {
                    role: "assistant",
                    content: `❌ Generation failed: ${err.message || "Unknown error"}`,
                    timestamp: new Date(),
                }
            }
        });
    }
}

export async function listProjects(req, res, next) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const projects = await Project.find(
            { owner: req.user.userId },
            { name: 1, description: 1, version: 1, status: 1, createdAt: 1, updatedAt: 1 }
        ).sort({ updatedAt: -1 }).lean();

        return res.json(projects);
    } catch (error) {
        next(error);
    }
}

export async function getProject(req, res, next) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid project ID format" });
        }

        const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const filesObj = {};
        if (project.files) {
            for (const [path, entry] of Object.entries(project.files)) {
                filesObj[path] = entry ? entry.content : "";
            }
        }

        return res.json({
            _id: project._id,
            name: project.name,
            description: project.description,
            files: filesObj,
            messages: project.messages,
            version: project.version,
            status: project.status,
            filesPlanned: project.filesPlanned,
            filesGenerated: project.filesGenerated,
            currentFile: project.currentFile,
            error: project.error,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteProject(req, res, next) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid project ID format" });
        }

        const result = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
        if (!result) {
            return res.status(404).json({ error: "Project not found" });
        }

        return res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

export async function updateProjectFiles(req, res, next) {
    try {
        const { files } = req.body;
        if (!files || typeof files !== 'object' || Array.isArray(files)) {
            return res.status(400).json({ error: "A valid files object is required" });
        }

        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid project ID format" });
        }

        const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const newFiles = {};
        for (const [path, content] of Object.entries(files)) {
            if (typeof content === "string") {
                newFiles[path] = { content, hash: hashContent(content) };
            }
        }

        project.files = newFiles;
        project.markModified("files");
        await project.save();

        const filesObj = {};
        for (const [path, entry] of Object.entries(project.files)) {
            filesObj[path] = entry.content;
        }

        return res.json({
            _id: project._id,
            name: project.name,
            description: project.description,
            files: filesObj,
            messages: project.messages,
            version: project.version,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        });
    } catch (error) {
        next(error);
    }
}

export async function publishProject(req, res, next) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid project ID format" });
        }

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, owner: req.user.userId },
            { published: true },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        return res.json({ success: true, published: project.published });
    } catch (error) {
        next(error);
    }
}

export async function getPublicProject(req, res, next) {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid project ID format" });
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.published) {
            return res.status(403).json({ error: "Project is not published yet" });
        }

        const filesObj = {};
        if (project.files) {
            for (const [path, entry] of Object.entries(project.files)) {
                filesObj[path] = entry ? entry.content : "";
            }
        }

        return res.json({
            _id: project._id,
            name: project.name,
            description: project.description,
            files: filesObj,
            version: project.version,
        });
    } catch (error) {
        next(error);
    }
}

import { Project } from "../model/Project.js";
import { reviseProject } from "../services/ai.js";
import { applyOperations } from "../services/diff.js";

export function buildManifest(files) {
  const manifest = [];
  for (const [path, entry] of Object.entries(files)) {
    manifest.push({
      path,
      hash: entry.hash,
      size: entry.content.length,
    });
  }
  return manifest;
}

//POST /api/projects/:id/chat
// Sand a revision prompt and return updated project
export async function chat(req, res) {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let project;
  try {
    project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });
  } catch (err) {
    // Catches invalid ObjectId format and other lookup errors
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Set status to revising and save user prompt immediately
  project.status = "revising";
  project.messages.push({
    role: "user",
    content: prompt,
    timestamp: new Date(),
  });
  await project.save();

  try {
    // Build compact manifest (path + hash + size) instead of sending all code
    const manifest = buildManifest(project.files);

    // Include all file contents so the AI can do accurate search/replace
    const relevantFiles = {};

    for (const [path, entry] of Object.entries(project.files)) {
      relevantFiles[path] = entry.content;
    }

    // Recent message history for context (at most 4), excluding the prompt
    // we're about to send separately, since it was just pushed above
    const recentMessages = project.messages.slice(-5, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call AI with manifest + relevant files
    const result = await reviseProject(
      prompt,
      manifest,
      relevantFiles,
      recentMessages,
    );

    console.log(
      `[AI] Got ${result.operations.length} operations: ${result.description}`,
    );

    // Apply operations to project files
    const {
      files: updatedFiles,
      applied,
      errors,
    } = applyOperations(project.files, result.operations);

    if (errors.length > 0) {
      console.warn(`[Diff] Errors while applying operations:`, errors);
    }

    // Update project in DB
    project.files = updatedFiles;
    project.markModified("files");
    project.version += 1;
    project.status = "completed";
    project.messages.push({
      role: "assistant",
      content:
        result.description +
        (errors.length > 0
          ? `\n\nSome operations failed: ${errors.join(", ")}`
          : ""),
      timestamp: new Date(),
    });

    await project.save();

    // Return updated project
    const filesObj = {};
    for (const [path, entry] of Object.entries(project.files)) {
      filesObj[path] = entry.content;
    }

    res.status(200).json({
      _id: project._id,
      name: project.name,
      description: project.description,
      files: filesObj,
      messages: project.messages,
      version: project.version,
      status: project.status,
      applied,
      errors,
      aiDescription: result.description,
    });
  } catch (err) {
    console.error(`[AI Revision Error] ${err.message}`);
    project.status = "failed";
    project.messages.push({
      role: "assistant",
      content: "Sorry, something went wrong while processing that request.",
      timestamp: new Date(),
    });
    await project.save();
    res
      .status(500)
      .json({ error: err.message || "Failed to process revision request" });
  }
}

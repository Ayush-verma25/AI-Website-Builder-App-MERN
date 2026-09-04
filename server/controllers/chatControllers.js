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

  const project = await Project.findOne({
    _id: req.params.id,
    owner: req.user.userId,
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  //Set status to revising and save user prompt immidiately
  project.status = "revising";
  project.message.push({
    role: "user",
    content: prompt,
    timestamp: new Date(),
  });
  await project.save();

  try {
    // Build Compact manifest (path + hash + size)insted of sending all code
    const manifest = buildManifest(project.files);

    //Include All file contents so the AI can do accuratesearch/replace
    const relevantFiles = {};

    for (const [path, entry] of Object.entries(project.files)) {
      relevantFiles[path] = entry.content;
    }

    // Recent messages fo content(at most 4
    const recentMessages = project.message.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    //Call Ai with menefest +relevent files
    const result = await reviseProject(
      prompt,
      manifest,
      relevantFiles,
      recentMessages,
    );

    console.log(
      `[AI] Got ${result.operations.length} operations: ${result.description}`,
    );

    //Apply opertaions to project files
    const { files, updatedFiles, applied, errors } = applyOperations(
      project.files,
      result.operations,
    );

    if (errors.length > 0) {
      console.warn(`[Diff] Errors while applying operations:`, errors);
    }

    //Update Project in DB
    project.files = updatedFiles;
    project.markModified("files");
    project.version += 1;
    project.status = "completed";
    project.message.push({
      role: "assistant",
      content:
        result.description +
        (errors.length > 0
          ? `\n\n Some Operations Failed: ${errors.join(", ")}`
          : ""),
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
      message: project.message,
      version: project.version,
      status: project.status,
      applied,
      errors,
      aiDescription: result.description,
    });
  } catch (err) {
    console.error(`[AI Revision Error] ${err.message}`);
    project.status = "completed";
    await project.save();
    res
      .status(500)
      .json({ error: err.message || "Failed to process revision request" });
  }
}

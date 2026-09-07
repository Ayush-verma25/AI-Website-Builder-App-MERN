import {createOpenAI} from '@ai-sdk/openai'
import { generateObject } from 'ai';
import pMap from "p-map";
import { FileCodeSchema, FilePlanSchema, RevisionResultSchema } from './aiSchemas.js';
import { buildFileCodeSystem, FILE_PLAN_SYSTEM, REVISE_SYSTEM } from './prompts.js';
import { el } from 'zod/v4/locales';
import { normalizeContent } from './contentNormalizer.js';
import { validateAndFixCode, validateRevisionContent } from './codeValidator.js';

// --- OpenRouter Model Client Setup ---
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const MAX_CONCURRENCY = parseInt(process.env.AI_MAX_CONCURRENCY || "6", 10)

const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
})

const model = openrouter(MODEL);

// Generate a single file's code
async function generateSingleFile(file, allFiles, prompt, alreadyGeneratedFiles){
     const system = buildFileCodeSystem(allFiles, alreadyGeneratedFiles);

     const userMsg = `Project: ${prompt}\n\nWrite the complete code for: ${file.path}\nPurpose: ${file.description}`;

     console.log(`[AI] Creating file: ${file.path}...`);
     const { object } = await generateObject({
        model,
        schema: FileCodeSchema,
        system,
        prompt: userMsg,
        maxRetries: 2,
     })

     let code = normalizeContent(object.code);

     if(code.trim().length === 0){
        throw new Error("Generated code is empty after normalization");
     }

     // Apply post-generation validation and auto-fixing
     const validation = validateAndFixCode(code, file.path, {allPlannedFiles: allFiles});

     code = validation.code;

     if(validation.warnings.length > 0){
        console.log(`[Validator] Code adjustments for ${file.path}:\n  - ${validation.warnings.join("\n  - ")}`);
     }

     console.log(`[AI] Created file: ${file.path} (${code.length} chars)`);
     return {path: file.path, code}
}

// Generate project files: plan first, then build files in order with fallback retries
export async function generateProject(prompt, callbacks){
    // Phase 1: Plan
    console.log(`[AI] Phase 1: Planning file structure for: "${prompt.slice(0,80)}..."`);
    const { object: plan } = await generateObject({
        model,
        schema: FilePlanSchema,
        system: FILE_PLAN_SYSTEM,
        prompt: `Plan a React website for: ${prompt}`,
        maxRetries: 2,
    });

    if(!plan.files.find((f)=> f.path === "/App.js")){
        plan.files.unshift({
            path: "/App.js",
            description: "Main application entry point",
            exports: "default App",
            imports: ["./styles.css"],
        })
    }

    if(!plan.files.find((f)=> f.path === "/styles.css")){
        plan.files.push({
             path: "/styles.css",
            description: "Global CSS: Google Font import, keyframe animations, utility classes",
            exports: "none",
            imports: [],
        })
    }

    if(callbacks?.onPlan){
        await callbacks.onPlan(plan)
    }

    console.log(`[AI] Phase 2: Generating ${plan.files.length} files in parallel (concurrency=${MAX_CONCURRENCY}): ${plan.files.map((f)=> f.path).join(", ")}`);


    const files = {};
    let pendingFiles = plan.files.map((f)=>({...f}));

    const maxRetryRounds = 2;

    for (let round = 0; round <= maxRetryRounds; round++) {
        if(pendingFiles.length === 0) break;

        if(round > 0){
            console.log(
                `[AI] Retry round ${round}/${maxRetryRounds} for ${pendingFiles.length} failed files: ${pendingFiles.map((f) => f.path).join(", ")}`,
            );
        }

        const results = await pMap(
            pendingFiles,
            async (file) => {
                try {
                    if (callbacks?.onFileStart){
                        await callbacks.onFileStart(file.path)
                    }

                    const singleResult = await generateSingleFile(file, plan.files, prompt, files)

                    if(callbacks?.onFileComplete){
                        await callbacks.onFileComplete(file.path, singleResult.code)
                    }
                    return {success: true, file, result: singleResult }
                } catch (err) {
                    return { success: false, file, error: err };
                }
            },
            {concurrency: MAX_CONCURRENCY},
        )

         const failedFiles = [];
         for (const entry of results) {
            if (entry.success) {
                const { path, code } = entry.result;
                files[path.startsWith("/") ? path : "/" + path] = code;
            }else{
                console.warn(`[AI] File ${entry.file.path} failed in round ${round}: ${entry.error?.message || entry.error}`);
                failedFiles.push(entry.file)
            }
         }
         pendingFiles = failedFiles;
    }

    if(pendingFiles.length > 0){
        const failedPaths = pendingFiles.map((f)=>f.path).join(", ");
        console.error(`[AI] Failed to generate ${pendingFiles.length} files after all retry rounds: ${failedPaths}`);

        if (pendingFiles.some((f) => f.path === "/App.js")){
            const ext = file.path.split(".").pop()?.toLowerCase();

            if(ext === "css"){
                files[file.path] = `/* ${file.description} — Generation failed, please retry */\n`
            }else{
                files[file.path] = "import React from 'react';\n\n" + 
                `// ⚠️ This file could not be generated. Please retry.\n` +
                `// Purpose: ${file.description}\n\n` + 
                "export default function Placeholder() {\n" +
                "  return (\n" +
                    "    <div className='p-8 text-center text-zinc-400'>\n" +
                    "      <p>⚠️ Component failed to generate. Please try again.</p>\n" +
                    "    </div>\n" +
                    "  );\n" +
                    "}\n";
            }
        }

    }

    if(!files["/App.js"]){
        throw new Error("AI did not generate /App.js entry point");
    }

    return {files, description: plan.projectDescription}
}

export async function reviseProject(prompt, manifest, relevantFiles, recentMessages){
    const contextParts = [];

    contextParts.push("## Current Project Files (manifest)");
    contextParts.push("```");
    for (const f of manifest) {
        contextParts.push(`${f.path} (${f.hash}, ${f.size}B)`)
    }
    contextParts.push("```");

    if(Object.keys(relevantFiles).length > 0){
        contextParts.push("\n## File Contents (for reference)");
        for (const [path, content] of Object.entries(relevantFiles)) {
        contextParts.push(`\n### ${path}\n\`\`\`\n${content}\n\`\`\``)
    }
    }

    if(recentMessages.length > 0){
        contextParts.push("\n## Recent Conversation");
        for (const msg of recentMessages.slice(-3)) {
        contextParts.push(`${msg.role}: ${msg.content}`)
    }
    }

    contextParts.push(`\n## Revision Request\n${prompt}`);

    console.log("[AI] Revising project...");

    const { object: rawParsed } = await generateObject({
        model,
        schema: RevisionResultSchema,
        system: REVISE_SYSTEM,
        prompt: contextParts.join("\n"),
        maxRetries: 2
    })

    if(rawParsed && Array.isArray(rawParsed.operations)){
        rawParsed.operations = rawParsed.operations.map((op)=>{
            if(!op || typeof op !== "object") return op;

            let opStr = String(op.op || "").trim().toLowerCase();

            if(["create", "add", "new"].includes(opStr)) op.op = "create";
            else if (["update", "edit", "modify", "patch"].includes(opStr)) op.op = "update";
            else if (["delete", "remove", "del", "rm"].includes(opStr)) op.op = "delete";

            if(op.path && typeof op.path === "string" && !op.path.startsWith("/")){
                op.path = "/" + op.path;
            }

            if (op.content) op.content = normalizeContent(op.content);
            if (op.search) op.search = normalizeContent(op.search);
            if (op.replace) op.replace = normalizeContent(op.replace);

            if (op.op === "create" && op.content){
                const validation = validateRevisionContent(op.content, op.path, "create");
                op.content = validation.content;
                if(validation.warnings.length > 0){
                    console.log(`[Validator] Revision Create adjustments for ${op.path}:\n  - ${validation.warnings.join("\n  - ")}`);
                }
            }else if(op.op === "update" && op.replace){
                 const validation = validateRevisionContent(op.replace, op.path, "update");
                 op.replace = validation.content;
                 if(validation.warnings.length > 0){
                    console.log(`[Validator] Revision Update adjustments for ${op.path}:\n  - ${validation.warnings.join("\n  - ")}`);
                 }
            }
            return op;
        })
    }
    return rawParsed;
}
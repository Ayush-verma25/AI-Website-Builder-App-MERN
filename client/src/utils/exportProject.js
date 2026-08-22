import { detectDependencies } from "./sandpackUtils";

export async function exportProjectZip(project) {
    if (!project) return;
    try {
        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");

        const zip = new JSZip();

        // Normalize files and detect dependencies from import statements
        const fileMap = {};
        for (const [path, content] of Object.entries(project.files)) {
            const fileCode = typeof content === "string" ? content : content?.content || "";
            fileMap[path] = fileCode;
        }
        const detectedDeps = detectDependencies(fileMap);

        // Add package.json
        zip.file(
            "package.json",
            JSON.stringify(
                {
                    name: (project.name || "my-website").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    private: true,
                    version: "0.1.0",
                    type: "module",
                    scripts: {
                        dev: "vite",
                        build: "vite build",
                        preview: "vite preview",
                    },
                    dependencies: {
                        react: "^18.2.0",
                        "react-dom": "^18.2.0",
                        ...detectedDeps,
                    },
                    devDependencies: {
                        "@vitejs/plugin-react": "^4.2.0",
                        vite: "^5.0.0",
                        tailwindcss: "^3.4.0",
                        autoprefixer: "^10.4.0",
                        postcss: "^8.4.0",
                    },
                },
                null,
                2,
            ),
        );

        // Add vite.config.js configured for JSX parsing in both .js and .jsx files
        zip.file(
            "vite.config.js",
            `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\\/.*\\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});
`,
        );

        // Add index.html
        zip.file(
            "index.html",
            `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name || "My Website"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.jsx"></script>
</body>
</html>
`,
        );

        // Add index.jsx entry
        zip.file(
            "src/index.jsx",
            `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
`,
        );

        // Add project files
        for (const [path, content] of Object.entries(fileMap)) {
            const cleanPath = path.startsWith("/") ? path.slice(1) : path;
            zip.file(`src/${cleanPath}`, content);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const fileName = `${(project.name || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
        saveAs(blob, fileName);
    } catch (error) {
        console.error("Export project error:", error);
    }
}

import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "github-api-proxy",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ? req.url.split("?")[0] : "";
          if (url !== "/api/readme") {
            return next();
          }

          const token = process.env.GITHUB_TOKEN;
          if (!token) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "GITHUB_TOKEN environment variable not set" }));
            return;
          }

          try {
            const owner = "frostlynx51";
            const repo = "Notes";
            const filePath = "README.md";
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

            const response = await fetch(apiUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.raw",
                "User-Agent": "github-readme-editor",
              },
            });

            if (!response.ok) {
              const errorBody = await response.text().catch(() => "");
              res.statusCode = response.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: `GitHub API error: ${response.status} ${response.statusText}`, details: errorBody }));
              return;
            }

            const content = await response.text();
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(content);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      },
    },
  ],
  server: {
    port: 5173,
  },
});

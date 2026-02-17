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

          // Handle POST for saving
          if (req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", async () => {
              try {
                const { content } = JSON.parse(body);
                const token = process.env.GITHUB_TOKEN;
                if (!token) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "GITHUB_TOKEN environment variable not set" }));
                  return;
                }

                const owner = "frostlynx51";
                const repo = "Notes";
                const filePath = "README.md";
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

                // First, get current file SHA
                const getResponse = await fetch(apiUrl, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "github-readme-editor",
                  },
                });

                if (!getResponse.ok) {
                  res.statusCode = getResponse.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: `Failed to get file SHA: ${getResponse.status}` }));
                  return;
                }

                const fileData = await getResponse.json();
                const sha = fileData.sha;

                // Now update the file
                const updateResponse = await fetch(apiUrl, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "github-readme-editor",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: "Update README.md from editor",
                    content: Buffer.from(content).toString("base64"),
                    sha,
                  }),
                });

                if (!updateResponse.ok) {
                  const errorBody = await updateResponse.text().catch(() => "");
                  res.statusCode = updateResponse.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: `Failed to save: ${updateResponse.status}`, details: errorBody }));
                  return;
                }

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true }));
              } catch (error) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: error.message }));
              }
            });
            return;
          }

          // Handle GET for loading

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

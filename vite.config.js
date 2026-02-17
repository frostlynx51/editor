import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "github-api-proxy",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ? req.url.split("?")[0] : "";
          
          // Handle read endpoint
          if (url === "/api/readme" && req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", async () => {
              try {
                const { repo, token } = JSON.parse(body);
                if (!repo || !token) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "repo and token required" }));
                  return;
                }

                const [owner, repoName] = repo.split("/");
                if (!owner || !repoName) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Invalid repo format. Use: owner/repo" }));
                  return;
                }

                const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/README.md`;
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
                  res.end(JSON.stringify({ error: `GitHub API error: ${response.status}`, details: errorBody }));
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
            return;
          }

          // Handle save endpoint
          if (url === "/api/save" && req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", async () => {
              try {
                const { repo, token, content } = JSON.parse(body);
                if (!repo || !token || content === undefined) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "repo, token, and content required" }));
                  return;
                }

                const [owner, repoName] = repo.split("/");
                if (!owner || !repoName) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Invalid repo format. Use: owner/repo" }));
                  return;
                }

                const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/README.md`;

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

          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
  },
});

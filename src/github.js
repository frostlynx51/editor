function getRepoParts(settings) {
  const repo = settings?.repo || "";
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    throw new Error("Repository must be in owner/repo format");
  }
  return { owner, repoName };
}

function encodeUtf8ToBase64(value) {
  return btoa(
    Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join("")
  );
}

export async function loadRepoMarkdownFiles({ settings }) {
  if (!settings) return [];

  const { owner, repoName } = getRepoParts(settings);
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-editor",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load repository files");
  }

  const data = await response.json();
  return data.tree
    .filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".md"))
    .map((item) => item.path)
    .sort();
}

export async function fetchFileFromGithub({ settings, filePath, dailyTemplate }) {
  if (!settings) throw new Error("Settings not configured");

  const { owner, repoName } = getRepoParts(settings);
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github.raw",
      "User-Agent": "github-editor",
    },
  });

  if (!response.ok) {
    if (response.status === 404 && filePath.startsWith(settings.dailyFolder)) {
      return dailyTemplate ? dailyTemplate() : "";
    }
    throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

export async function saveFileToGithub({ settings, filePath, content, commitMessage }) {
  if (!settings) throw new Error("Settings not configured");

  const { owner, repoName } = getRepoParts(settings);
  const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, "/");
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodedPath}`;

  const getResponse = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "github-editor",
    },
    cache: "no-store",
  });

  let sha = null;
  if (getResponse.ok) {
    const contentType = getResponse.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`Got non-JSON response when fetching file metadata: ${contentType || "unknown"}`);
    }
    const fileData = await getResponse.json();
    sha = fileData.sha;
  } else if (getResponse.status !== 404) {
    throw new Error(`Failed to check file metadata: ${getResponse.status} ${getResponse.statusText}`);
  }

  const updatePayload = {
    message: commitMessage || `Update ${filePath} from editor`,
    content: encodeUtf8ToBase64(content),
  };

  if (sha) {
    updatePayload.sha = sha;
  }

  const updateResponse = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-editor",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatePayload),
  });

  if (!updateResponse.ok) {
    const errorBody = await updateResponse.text().catch(() => "");
    throw new Error(`Failed to save: ${updateResponse.status} - ${errorBody}`);
  }
}

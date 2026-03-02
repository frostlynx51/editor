import { Octokit } from "@octokit/rest";

function getRepoParts(settings) {
  const repo = settings?.repo || "";
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    throw new Error("Repository must be in owner/repo format");
  }
  return { owner, repoName };
}

function createOctokit(settings) {
  if (!settings?.token) {
    throw new Error("GitHub token is required");
  }
  return new Octokit({
    auth: settings.token,
  });
}

export async function loadRepoMarkdownFiles({ settings }) {
  if (!settings) return [];

  const { owner, repoName } = getRepoParts(settings);
  const octokit = createOctokit(settings);

  try {
    const { data } = await octokit.git.getTree({
      owner,
      repo: repoName,
      tree_sha: "HEAD",
      recursive: "1",
    });

    return data.tree
      .filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".md"))
      .map((item) => ({ path: item.path, sha: item.sha }))
      .sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    throw new Error(`Failed to load repository files: ${error.message}`);
  }
}

export async function fetchFileFromGithub({ settings, filePath, dailyTemplate }) {
  if (!settings) throw new Error("Settings not configured");

  const { owner, repoName } = getRepoParts(settings);
  const octokit = createOctokit(settings);

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo: repoName,
      path: filePath,
      mediaType: {
        format: "raw",
      },
    });

    // When requesting raw format, data is a string
    return data;
  } catch (error) {
    if (error.status === 404) {
      // File doesn't exist on GitHub yet
      // For daily notes, use the template; for others, return empty string
      if (filePath.startsWith(settings.dailyFolder) && dailyTemplate) {
        return dailyTemplate();
      }
      return "";
    }
    throw new Error(`Failed to load file: ${error.message}`);
  }
}

export async function saveFileToGithub({ settings, filePath, content, commitMessage }) {
  if (!settings) throw new Error("Settings not configured");

  const { owner, repoName } = getRepoParts(settings);
  const octokit = createOctokit(settings);

  try {
    // Try to get existing file SHA
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo: repoName,
        path: filePath,
      });
      
      // data could be an array if it's a directory, but we expect a file
      if (!Array.isArray(data)) {
        sha = data.sha;
      }
    } catch (error) {
      // File doesn't exist, that's fine - we'll create it
      if (error.status !== 404) {
        throw error;
      }
    }

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: filePath,
      message: commitMessage || `Update ${filePath} from editor`,
      content: Buffer.from(content, "utf-8").toString("base64"),
      sha: sha,
    });

    return data.content?.sha || sha;
  } catch (error) {
    throw new Error(`Failed to save: ${error.message}`);
  }
}

/**
 * Save multiple files to GitHub in batch (single commit)
 */
export async function saveMultipleFilesToGithub({ settings, files, onProgress, commitMessage }) {
  if (!settings) throw new Error("Settings not configured");
  if (!files || files.length === 0) return { succeeded: [], failed: [] };

  const { owner, repoName } = getRepoParts(settings);
  const octokit = createOctokit(settings);
  const branch = settings.branch || "main";

  try {
    // Step 1: Get the current HEAD commit
    if (onProgress) onProgress(1, 4, "Getting HEAD commit");
    
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
    });

    const currentCommitSha = refData.object.sha;

    // Step 2: Get the current commit to get the tree SHA
    if (onProgress) onProgress(2, 4, "Getting commit tree");
    
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: currentCommitSha,
    });

    const baseTreeSha = commitData.tree.sha;

    // Step 3: Create a new tree with all file changes
    if (onProgress) onProgress(3, 4, `Creating tree with ${files.length} file(s)`);
    
    const tree = files.map(file => ({
      path: file.path,
      mode: "100644", // Regular file
      type: "blob",
      content: file.content,
    }));

    const { data: treeData } = await octokit.git.createTree({
      owner,
      repo: repoName,
      base_tree: baseTreeSha,
      tree: tree,
    });

    // Step 4: Create a new commit
    if (onProgress) onProgress(4, 4, "Creating commit");
    
    const defaultCommitMessage = files.length === 1 
      ? `Update ${files[0].path} from editor`
      : `Update ${files.length} files from editor`;

    const { data: newCommitData } = await octokit.git.createCommit({
      owner,
      repo: repoName,
      message: commitMessage || defaultCommitMessage,
      tree: treeData.sha,
      parents: [currentCommitSha],
    });

    // Step 5: Update the branch reference
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
      sha: newCommitData.sha,
      force: false,
    });

    // All files succeeded
    return {
      succeeded: files.map(file => ({ path: file.path, sha: newCommitData.sha })),
      failed: []
    };

  } catch (error) {
    // If batch commit fails, fall back to all files failed
    return {
      succeeded: [],
      failed: files.map(file => ({
        path: file.path,
        error: error instanceof Error ? error.message : String(error)
      }))
    };
  }
}

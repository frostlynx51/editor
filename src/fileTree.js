/**
 * File tree component for rendering hierarchical file structure
 */

export class FileTree {
  constructor({ container, onFileSelect, fileManager }) {
    this.container = container;
    this.onFileSelect = onFileSelect;
    this.fileManager = fileManager;
    this.expandedDirs = new Set();
    this.allFiles = [];
    this.treeData = [];
    this.selectedDirectory = null; // Track selected directory for new file creation
  }

  /**
   * Build hierarchical tree structure from flat file list
   */
  buildTree(files) {
    this.allFiles = files;
    const root = { type: 'root', children: {} };

    files.forEach(path => {
      const parts = path.split('/');
      let current = root;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File node
          if (!current.children) current.children = {};
          current.children[part] = {
            type: 'file',
            path,
            name: part
          };
        } else {
          // Directory node
          if (!current.children) current.children = {};
          if (!current.children[part]) {
            current.children[part] = {
              type: 'directory',
              name: part,
              path: parts.slice(0, index + 1).join('/'),
              children: {}
            };
          }
          current = current.children[part];
        }
      });
    });

    return this.sortTree(root.children);
  }

  /**
   * Sort tree: directories first, then alphabetically
   */
  sortTree(children) {
    if (!children) return [];
    
    const entries = Object.entries(children);
    entries.sort(([, a], [, b]) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return entries.map(([, node]) => {
      if (node.type === 'directory' && node.children) {
        node.children = this.sortTree(node.children);
      }
      return node;
    });
  }

  /**
   * Toggle directory expansion state
   */
  toggleDirectory(path) {
    if (this.expandedDirs.has(path)) {
      this.expandedDirs.delete(path);
    } else {
      this.expandedDirs.add(path);
    }
    this.render();
  }

  /**
   * Render file tree node recursively
   */
  renderNode(node, level = 0) {
    const indent = level * 16;
    
    if (node.type === 'file') {
      const isDirty = this.fileManager.isFileDirty(node.path);
      const isActive = this.fileManager.getActiveFile() === node.path;
      
      return `
        <div class="tree-item tree-file ${isActive ? 'active' : ''}" 
             data-path="${node.path}" 
             data-type="file"
             style="padding-left: ${indent}px">
          <span class="tree-icon">📄</span>
          <span class="tree-label">${node.name}</span>
          ${isDirty ? '<span class="dirty-indicator">●</span>' : ''}
        </div>
      `;
    }
    
    if (node.type === 'directory') {
      const isExpanded = this.expandedDirs.has(node.path);
      const isSelected = this.selectedDirectory === node.path;
      const arrow = isExpanded ? '▼' : '▶';
      
      let html = `
        <div class="tree-item tree-directory ${isSelected ? 'selected' : ''}" 
             data-path="${node.path}" 
             data-type="directory"
             style="padding-left: ${indent}px">
          <span class="tree-arrow">${arrow}</span>
          <span class="tree-icon">📁</span>
          <span class="tree-label">${node.name}</span>
        </div>
      `;
      
      if (isExpanded && node.children) {
        node.children.forEach(child => {
          html += this.renderNode(child, level + 1);
        });
      }
      
      return html;
    }
    
    return '';
  }

  /**
   * Render recent files section
   */
  renderRecentFiles() {
    const recentFiles = this.fileManager.getRecentFiles().slice(0, 10);
    
    if (recentFiles.length === 0) {
      return '<div class="recent-empty">No recent files</div>';
    }
    
    return recentFiles.map(path => {
      const fileName = path.split('/').pop();
      const isDirty = this.fileManager.isFileDirty(path);
      const isActive = this.fileManager.getActiveFile() === path;
      
      return `
        <div class="recent-item ${isActive ? 'active' : ''}" data-path="${path}">
          <span class="recent-icon">📄</span>
          <div class="recent-info">
            <div class="recent-name">${fileName}</div>
            ${path.includes('/') ? `<div class="recent-path">${path}</div>` : ''}
          </div>
          ${isDirty ? '<span class="dirty-indicator">●</span>' : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Render full tree
   */
  render() {
    if (!this.container) return;

    const recentHtml = this.renderRecentFiles();
    
    this.treeData = this.buildTree(this.allFiles);
    const treeHtml = this.treeData.map(node => this.renderNode(node, 0)).join('');
    
    this.container.innerHTML = `
      <div class="file-tree-header">
        <div class="file-tree-section-title">Recent Files</div>
      </div>
      <div class="recent-files">
        ${recentHtml}
      </div>
      <div class="file-tree-header">
        <div class="file-tree-section-title">Files</div>
        <div class="file-tree-actions">
          <button class="tree-new-file-btn" title="New File">+</button>
          <button class="tree-collapse-all" title="Collapse All">⊟</button>
        </div>
      </div>
      <div class="file-tree-content">
        ${treeHtml}
      </div>
    `;
    
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to tree elements
   */
  attachEventListeners() {
    // File clicks in tree
    this.container.querySelectorAll('.tree-file').forEach(el => {
      el.addEventListener('click', () => {
        const path = el.getAttribute('data-path');
        if (path && this.onFileSelect) {
          this.onFileSelect(path);
        }
      });
    });
    
    // Directory clicks
    this.container.querySelectorAll('.tree-directory').forEach(el => {
      el.addEventListener('click', (e) => {
        const path = el.getAttribute('data-path');
        if (path) {
          // Toggle selection on click
          if (this.selectedDirectory === path) {
            this.selectedDirectory = null;
          } else {
            this.selectedDirectory = path;
          }
          this.toggleDirectory(path);
        }
      });
    });
    
    // Recent file clicks
    this.container.querySelectorAll('.recent-item').forEach(el => {
      el.addEventListener('click', () => {
        const path = el.getAttribute('data-path');
        if (path && this.onFileSelect) {
          this.onFileSelect(path);
        }
      });
    });
    
    // Collapse all button
    const collapseBtn = this.container.querySelector('.tree-collapse-all');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.expandedDirs.clear();
        this.render();
      });
    }
    
    // New file button
    const newFileBtn = this.container.querySelector('.tree-new-file-btn');
    if (newFileBtn) {
      newFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.createNewFile();
      });
    }
  }

  /**
   * Update tree with new file list
   */
  updateFiles(files) {
    this.allFiles = files;
    this.render();
  }

  /**
   * Expand directories to reveal a specific file
   */
  revealFile(filePath) {
    const parts = filePath.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join('/');
      this.expandedDirs.add(dirPath);
    }
    this.render();
  }
  
  /**
   * Create a new file in the selected directory or root
   */
  createNewFile() {
    const fileName = prompt(
      this.selectedDirectory 
        ? `Create new file in "${this.selectedDirectory}":` 
        : 'Create new file:',
      'new-file.md'
    );
    
    if (!fileName) return;
    
    // Sanitize filename
    const sanitized = fileName.trim().replace(/^\/+/, '');
    if (!sanitized) return;
    
    // Construct full path
    let fullPath;
    if (this.selectedDirectory) {
      fullPath = `${this.selectedDirectory}/${sanitized}`;
    } else {
      fullPath = sanitized;
    }
    
    // Check if file already exists
    if (this.allFiles.includes(fullPath)) {
      alert(`File "${fullPath}" already exists`);
      return;
    }
    
    // Initialize new file with empty content in FileManager
    // This marks it as a new file that doesn't need to be fetched from GitHub
    this.fileManager.setFileContent(fullPath, '', { autoSave: false, isClean: false });
    
    // Add to file list and trigger file select
    this.allFiles.push(fullPath);
    this.allFiles.sort();
    
    // Expand parent directory if needed
    if (this.selectedDirectory) {
      this.expandedDirs.add(this.selectedDirectory);
    }
    
    // Re-render to show new file
    this.render();
    
    // Select the new file
    if (this.onFileSelect) {
      this.onFileSelect(fullPath);
    }
  }
}

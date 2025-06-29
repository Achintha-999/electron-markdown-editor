document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const newBtn = document.getElementById('new-btn');
    const openBtn = document.getElementById('open-btn');
    const saveBtn = document.getElementById('save-btn');
    const previewBtn = document.getElementById('preview-btn');
    const aboutBtn = document.getElementById('about-btn');

    let isPreview = false;
    let currentFilePath = null;

 
    marked.setOptions({
        highlight: function(code, lang) {
            if (hljs.getLanguage(lang)) {
                return hljs.highlight(lang, code).value;
            }
            return hljs.highlightAuto(code).value;
        }
    });

    editor.addEventListener('input', () => {
        preview.innerHTML = marked.parse(editor.value);
        window.electronAPI.setModified(true);
        updateFileStatus();
    });

  
    previewBtn.addEventListener('click', () => {
        isPreview = !isPreview;
        if (isPreview) {
            editor.classList.add('hidden');
            preview.classList.remove('hidden');
            preview.innerHTML = marked.parse(editor.value);
        } else {
            editor.classList.remove('hidden');
            preview.classList.add('hidden');
        }
    });

 
    newBtn.addEventListener('click', async () => {
        if (await confirmUnsavedChanges()) {
            const { success } = await window.electronAPI.newFile();
            if (success) {
                editor.value = '';
                currentFilePath = null;
                preview.innerHTML = '';
            }
        }
    });

   
    saveBtn.addEventListener('click', async () => {
        const content = editor.value;
        if (!content) return;
        
        const result = await window.electronAPI.saveFile(content, currentFilePath);
        if (result.success) {
            currentFilePath = result.path;
        }
    });

    
    openBtn.addEventListener('click', async () => {
        if (await confirmUnsavedChanges()) {
            const result = await window.electronAPI.openFile();
            if (result.success) {
                editor.value = result.content;
                currentFilePath = result.path;
                preview.innerHTML = marked.parse(result.content);
            }
        }
    });

  
    aboutBtn.addEventListener('click', () => {
        window.electronAPI.showAboutDialog();
    });

    
    async function confirmUnsavedChanges() {
        const fileInfo = await window.electronAPI.getFileInfo();
        if (fileInfo.isModified) {
          const result = await window.electronAPI.showSaveDialog({
            title: 'Unsaved Changes',
            message: 'Do you want to save your changes before continuing?',
            buttons: ['Save', 'Discard', 'Cancel']
          });
          
          if (result.response === 0) { // Save
            const saveResult = await window.electronAPI.saveFile(editor.value, currentFilePath);
            if (!saveResult.success) return false;
            currentFilePath = saveResult.path;
            return true;
          } else if (result.response === 1) { // Discard
            return true;
          }
          return false; // Cancel
        }
        return true;
      }

    // Update file status display
    async function updateFileStatus() {
        const fileInfo = await window.electronAPI.getFileInfo();
        const filePathElement = document.getElementById('file-path');
        const modifiedIndicator = document.getElementById('modified-indicator');
        
        if (filePathElement) {
            filePathElement.textContent = fileInfo.path ? 
                fileInfo.path.split(/[\\/]/).pop() : 'Untitled';
        }
        if (modifiedIndicator) {
            modifiedIndicator.textContent = fileInfo.isModified ? 'Modified' : '';
        }
    }

    // Initialize
    window.electronAPI.getFileInfo().then(fileInfo => {
        if (fileInfo.content) {
            editor.value = fileInfo.content;
            preview.innerHTML = marked.parse(fileInfo.content);
        }
        updateFileStatus();
    });
});
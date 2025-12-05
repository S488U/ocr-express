const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const form = document.getElementById('ocr-form');
const imageUrlInput = document.getElementById('image-url');
const thumbsContainer = document.getElementById('thumbs-container');
const resultsStack = document.getElementById('results-stack');
const errorDiv = document.getElementById('error');
const modalBg = document.getElementById('modal-bg');
const modalImg = document.getElementById('modal-img');
const modalCaption = document.getElementById('modal-caption');
const modalClose = document.getElementById('modal-close');
const runBtn = document.querySelector('button[type="submit"]');

// State
let imageFiles = [];
// We track created URLs to prevent memory leaks by revoking them when no longer needed
let activeObjectUrls = []; 

// --- Helper: Render Thumbnails ---
function renderThumbs() {
  // 1. Cleanup old object URLs to free memory
  activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
  activeObjectUrls = [];
  
  thumbsContainer.innerHTML = '';

  imageFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    activeObjectUrls.push(url);

    const div = document.createElement('div');
    // Using Tailwind classes from your HTML
    div.className = 'thumb relative w-20 h-20 rounded-lg overflow-hidden shadow bg-black flex items-center justify-center border border-gray-700 hover:border-accent transition-colors';
    div.innerHTML = `
      <img src="${url}" alt="${file.name}" class="object-contain w-full h-full cursor-pointer" />
      <span class="tooltip">Preview image</span>
      <button type="button" class="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md transition-colors">×</button>
    `;

    // Remove button logic
    div.querySelector('button').onclick = (e) => {
      e.stopPropagation(); // Prevent triggering modal
      imageFiles.splice(idx, 1);
      renderThumbs();
    };

    // Preview logic
    div.querySelector('img').onclick = () => {
      showModal(url, file.name);
    };

    thumbsContainer.appendChild(div);
  });
}

// --- Helper: Modal ---
function showModal(src, caption) {
  modalImg.src = src;
  modalCaption.textContent = caption || '';
  modalBg.classList.add('active');
  modalBg.classList.remove('hidden');
}

function hideModal() {
  modalBg.classList.remove('active');
  modalBg.classList.add('hidden');
  modalImg.src = ''; // Clear src
}

modalClose.onclick = hideModal;
modalBg.onclick = (e) => {
  if (e.target === modalBg) hideModal();
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalBg.classList.contains('active')) hideModal();
});

// --- Input Handling ---

// 1. Drag & Drop
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('border-accent', 'bg-accent2');
});
uploadArea.addEventListener('dragleave', e => {
  e.preventDefault();
  uploadArea.classList.remove('border-accent', 'bg-accent2');
});
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('border-accent', 'bg-accent2');
  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    handleNewFiles(e.dataTransfer.files);
  }
});

// 2. File Select Button
selectBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files.length) {
    handleNewFiles(fileInput.files);
    fileInput.value = ''; // Reset so same files can be selected again if needed
  }
});

// 3. Paste from Clipboard
window.addEventListener('paste', e => {
  if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length) {
    handleNewFiles(e.clipboardData.files);
  }
});

// Common file handler
function handleNewFiles(fileList) {
  let hasInvalid = false;
  for (const f of fileList) {
    if (f.type.startsWith('image/')) {
      imageFiles.push(f);
    } else {
      hasInvalid = true;
    }
  }
  if (hasInvalid) {
    alert('Some files were skipped because they are not images.');
  }
  renderThumbs();
}

// --- Form Submission ---
let loadingDiv = null;

form.addEventListener('submit', async e => {
  e.preventDefault();
  errorDiv.textContent = '';
  resultsStack.innerHTML = '';
  
  // Parse URLs
  const urlList = imageUrlInput.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);

  if (!imageFiles.length && !urlList.length) {
    errorDiv.textContent = 'Please upload, paste, or provide at least one image or URL.';
    return;
  }

  // UI Loading State
  runBtn.disabled = true;
  runBtn.classList.add('opacity-60', 'cursor-not-allowed');
  runBtn.textContent = 'Processing...';
  
  loadingDiv = document.createElement('div');
  loadingDiv.className = 'w-full flex flex-col gap-4 mt-8';
  loadingDiv.innerHTML = `
    <div class="animate-pulse bg-[#23232b] border border-accent rounded-lg shadow-lg p-6 flex flex-col gap-4">
      <div class="h-6 w-1/3 bg-accent rounded mb-2"></div>
      <div class="h-4 w-full bg-gray-600 rounded mb-2"></div>
      <div class="h-4 w-2/3 bg-gray-600 rounded mb-2"></div>
      <div class="h-4 w-1/2 bg-gray-600 rounded"></div>
    </div>
  `;
  resultsStack.appendChild(loadingDiv);

  const formData = new FormData();
  imageFiles.forEach(f => formData.append('images', f));
  if (urlList.length) formData.append('urls', JSON.stringify(urlList));

  const frontendStart = performance.now();

  try {
    const response = await fetch('/ocr', { method: 'POST', body: formData });
    const frontendEnd = performance.now();
    
    if (!response.ok) {
      throw new Error(`Server Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.results || data.results.length === 0) throw new Error('No OCR results returned.');

    resultsStack.innerHTML = ''; // Clear loader
    let totalBackend = 0;
    
    // Process Results
    data.results.forEach(result => {
      if (!result.error) totalBackend += (result.time || 0);
      
      const card = document.createElement('div');
      card.className = 'result-card bg-[#23232b] border border-accent rounded-lg shadow-lg mb-6 p-4 sm:p-6 relative flex flex-col items-start gap-4';
      
      // Determine Image Source for Preview
      let imgSrc = '';
      if (result.type === 'file') {
        const file = imageFiles.find(f => f.name === result.name);
        if (file) {
          // We create a new specific URL for the result card. 
          // Note: In a long-running SPA, we'd want to track this too, 
          // but for a "submit and done" flow, letting the browser handle it is acceptable 
          // or we could push to activeObjectUrls if we kept the array.
          imgSrc = URL.createObjectURL(file);
        }
      } else {
        imgSrc = result.name;
      }

      const imgHtml = imgSrc 
        ? `<img src="${imgSrc}" alt="${result.name}" class="mini-img object-contain w-20 h-20 rounded-lg mb-2 inline-block align-middle cursor-pointer border border-accent hover:opacity-80 transition" title="View Full Image" />`
        : '';

      // Determine Content
      let ocrContent = '';
      if (result.error) {
        ocrContent = `<div class="text-red-500 mb-2 font-semibold">❌ ${result.error}</div>`;
      } else if (!result.text || !result.text.length || result.text.join('').trim() === '') {
        ocrContent = `<div class="bg-yellow-900/30 text-yellow-500 border border-yellow-700 rounded p-3 font-semibold mb-2">⚠️ No text recognized.</div>`;
      } else {
        const joinedText = result.text.join('\n');
        ocrContent = `
          <div class="ocr-lines bg-white text-black rounded p-3 font-mono text-sm sm:text-base mb-2 whitespace-pre-wrap max-w-full overflow-x-auto shadow-inner">${result.text.join('<br>')}</div>
          <button class="copy-btn absolute top-4 right-4 sm:top-6 sm:right-6 bg-accent text-black px-3 py-1 rounded font-bold hover:bg-yellow-400 transition shadow-sm text-sm">Copy</button>
        `;
      }

      card.innerHTML = `
        <div class="flex flex-row items-center w-full mb-2 gap-3">
          ${imgHtml}
          <h3 class="text-lg font-bold text-white break-all">${result.name}</h3>
        </div>
        <div class="flex-1 w-full relative">
          ${ocrContent}
        </div>
        <div class="timing text-xs sm:text-sm text-gray-400 mt-2 font-mono">
          Backend: ${(result.time || 0).toFixed(2)}s | Total: ${totalBackend.toFixed(2)}s | Net Latency: ${(frontendEnd - frontendStart).toFixed(0)}ms
        </div>
      `;

      // Copy Button Event
      const copyBtn = card.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.onclick = () => {
          const textToCopy = result.text.join('\n');
          navigator.clipboard.writeText(textToCopy);
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('bg-green-500', 'text-white');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('bg-green-500', 'text-white');
          }, 1500);
        };
      }

      // Modal Event
      const miniImg = card.querySelector('.mini-img');
      if (miniImg) {
        miniImg.onclick = () => showModal(imgSrc, result.name);
      }

      resultsStack.appendChild(card);
    });

    // Cleanup UI after success
    // Optional: Clear inputs so user can start fresh. 
    // If you prefer to keep them, remove the next 4 lines.
    imageFiles = [];
    renderThumbs(); // This cleans up the input preview URLs
    imageUrlInput.value = '';
    
  } catch (err) {
    console.error(err);
    errorDiv.innerHTML = `<span class="font-bold">Error:</span> ${err.message}`;
    if (loadingDiv) loadingDiv.remove();
  } finally {
    runBtn.disabled = false;
    runBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    runBtn.textContent = 'Run OCR';
  }
});

// --- Navbar Navigation ---
const navLinks = document.querySelectorAll('nav a');
const homeSection = document.getElementById('home');
const aboutSection = document.getElementById('about');
const apiSection = document.getElementById('api');

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const hash = link.getAttribute('href');
    
    // Simple Router
    [homeSection, aboutSection, apiSection].forEach(sec => sec.classList.add('hidden'));
    
    if (hash === '#home') homeSection.classList.remove('hidden');
    else if (hash === '#about') aboutSection.classList.remove('hidden');
    else if (hash === '#api') apiSection.classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
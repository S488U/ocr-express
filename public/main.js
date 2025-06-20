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

let imageFiles = [];
let urlList = [];

function renderThumbs() {
  thumbsContainer.innerHTML = '';
  imageFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.className = 'thumb relative w-20 h-20 rounded-lg overflow-hidden shadow bg-black flex items-center justify-center';
    div.innerHTML = `<img src="${url}" alt="${file.name}" class="object-contain w-full h-full cursor-pointer" />` +
      `<span class="tooltip">Preview image</span>` +
      `<button class="absolute top-1 right-1 bg-accent text-black rounded-full w-6 h-6 flex items-center justify-center font-bold">×</button>`;
    div.querySelector('button').onclick = e => {
      imageFiles.splice(idx, 1);
      renderThumbs();
    };
    div.querySelector('img').onclick = e => {
      showModal(url, file.name);
    };
    thumbsContainer.appendChild(div);
  });
}

function showModal(src, caption) {
  modalImg.src = src;
  modalCaption.textContent = caption || '';
  modalBg.classList.add('active');
  modalBg.classList.remove('hidden');
}
modalClose.onclick = () => {
  modalBg.classList.remove('active');
  modalBg.classList.add('hidden');
};
modalBg.onclick = e => {
  if (e.target === modalBg) {
    modalBg.classList.remove('active');
    modalBg.classList.add('hidden');
  }
};

// Drag & drop
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('border-accent');
});
uploadArea.addEventListener('dragleave', e => {
  e.preventDefault();
  uploadArea.classList.remove('border-accent');
});
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('border-accent');
  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    for (const f of e.dataTransfer.files) imageFiles.push(f);
    renderThumbs();
  }
});

// File select
selectBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  if (fileInput.files && fileInput.files.length) {
    for (const f of fileInput.files) imageFiles.push(f);
    renderThumbs();
  }
});

// Paste from clipboard
window.addEventListener('paste', e => {
  if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length) {
    for (const f of e.clipboardData.files) imageFiles.push(f);
    renderThumbs();
  }
});

const runBtn = document.querySelector('button[type="submit"]');
let loadingDiv = null;

form.addEventListener('submit', async e => {
  e.preventDefault();
  errorDiv.textContent = '';
  resultsStack.innerHTML = '';
  runBtn.disabled = true;
  runBtn.classList.add('opacity-60', 'cursor-not-allowed');
  // Show loading skeleton
  loadingDiv = document.createElement('div');
  loadingDiv.className = 'w-full flex flex-col gap-4 mt-8';
  loadingDiv.innerHTML = `
    <div class="animate-pulse bg-[#23232b] border border-accent rounded-lg shadow-lg p-6 flex flex-col gap-4">
      <div class="h-6 w-1/3 bg-accent rounded mb-2"></div>
      <div class="h-4 w-full bg-white rounded mb-2"></div>
      <div class="h-4 w-2/3 bg-white rounded mb-2"></div>
      <div class="h-4 w-1/2 bg-white rounded"></div>
    </div>
  `;
  resultsStack.appendChild(loadingDiv);

  // Parse URLs (comma or newline separated)
  urlList = imageUrlInput.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);

  if (!imageFiles.length && !urlList.length) {
    errorDiv.textContent = 'Please upload, paste, or provide at least one image or URL.';
    runBtn.disabled = false;
    runBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    if (loadingDiv) loadingDiv.remove();
    return;
  }

  const formData = new FormData();
  imageFiles.forEach(f => formData.append('images', f));
  if (urlList.length) formData.append('urls', JSON.stringify(urlList));

  const frontendStart = performance.now();
  try {
    const response = await fetch('/ocr', { method: 'POST', body: formData });
    const frontendEnd = performance.now();
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.results) throw new Error('No OCR results.');
    resultsStack.innerHTML = '';
    // Calculate total backend time
    let totalBackend = 0;
    data.results.forEach(r => { if (!r.error) totalBackend += r.time; });
    data.results.forEach(result => {
      const card = document.createElement('div');
      card.className = 'result-card bg-[#23232b] border border-accent rounded-lg shadow-lg mb-6 p-4 sm:p-6 relative flex flex-col items-start gap-4';
      let imgHtml = '';
      let imgSrc = '';
      if (result.type === 'file') {
        const file = imageFiles.find(f => f.name === result.name);
        if (file) {
          imgSrc = URL.createObjectURL(file);
          imgHtml = `<img src="${imgSrc}" alt="${result.name}" class="mini-img object-contain w-20 h-20 rounded-lg mb-2 inline-block align-middle cursor-pointer border border-accent" title="Preview image" />`;
        }
      } else if (result.type === 'url') {
        imgSrc = result.name;
        imgHtml = `<img src="${imgSrc}" alt="${result.name}" class="mini-img object-contain w-20 h-20 rounded-lg mb-2 inline-block align-middle cursor-pointer border border-accent" title="Preview image" />`;
      }
      let ocrContent = '';
      if (result.error) {
        ocrContent = `<div class="text-red-500 mb-2">${result.error}</div>`;
      } else if (!result.text || !result.text.length || result.text.join('').trim() === '') {
        ocrContent = `<div class="bg-yellow-100 text-yellow-800 rounded p-3 font-semibold mb-2">⚠️ No text recognized in this image.</div>`;
      } else {
        ocrContent = `<div class="ocr-lines bg-white text-black rounded p-3 font-mono text-base mb-2 whitespace-pre-wrap max-w-full overflow-x-auto">${result.text ? result.text.join('<br>') : ''}</div>` +
          `<button class="copy-btn absolute top-6 right-6 bg-accent text-black px-3 py-1 rounded font-semibold hover:bg-yellow-400 transition">Copy</button>`;
      }
      card.innerHTML =
        `<div class="flex flex-row items-center w-full mb-2"><h3 class="text-lg font-bold text-accent flex items-center">${imgHtml}<span class="ml-2 text-white break-all">${result.name.replace(/^.*[\\\/]/, '')}</span></h3></div>` +
        `<div class="flex-1 w-full">${ocrContent}</div>` +
        `<div class="timing text-accent mt-2">Backend: ${result.time.toFixed(2)}s | Total Backend: ${totalBackend.toFixed(2)}s | Frontend: ${(frontendEnd-frontendStart).toFixed(2)}ms</div>`;
      // Copy button
      if (!result.error && result.text && result.text.length && result.text.join('').trim() !== '') {
        card.querySelector('.copy-btn').onclick = () => {
          navigator.clipboard.writeText(result.text.join('\n'));
          card.querySelector('.copy-btn').textContent = 'Copied!';
          setTimeout(() => card.querySelector('.copy-btn').textContent = 'Copy', 1200);
        };
      }
      // Miniature image click for modal
      const mini = card.querySelector('.mini-img');
      if (mini) mini.onclick = () => showModal(imgSrc, result.name);
      resultsStack.appendChild(card);
    });
    // Clear images/urls after submit
    imageFiles = [];
    urlList = [];
    renderThumbs();
    imageUrlInput.value = '';
    runBtn.disabled = false;
    runBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    if (loadingDiv) loadingDiv.remove();
  } catch (err) {
    errorDiv.textContent = err.message || 'OCR failed!';
    runBtn.disabled = false;
    runBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    if (loadingDiv) loadingDiv.remove();
  }
});

// Navbar navigation
const navLinks = document.querySelectorAll('nav a');
const homeSection = document.getElementById('home');
const aboutSection = document.getElementById('about');
const apiSection = document.getElementById('api');
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const hash = link.getAttribute('href');
    homeSection.classList.add('hidden');
    aboutSection.classList.add('hidden');
    apiSection.classList.add('hidden');
    if (hash === '#home') homeSection.classList.remove('hidden');
    if (hash === '#about') aboutSection.classList.remove('hidden');
    if (hash === '#api') apiSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

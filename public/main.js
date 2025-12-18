/**
 * OCR Express Frontend Logic
 * Re-designed by Daive
 */

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const form = document.getElementById('ocr-form');
const imageUrlInput = document.getElementById('image-url');
const thumbsContainer = document.getElementById('thumbs-container');
const resultsStack = document.getElementById('results-stack');
const errorDiv = document.getElementById('error');
const runBtn = document.getElementById('run-btn');

// Modal Elements
const modalBg = document.getElementById('modal-bg');
const modalImg = document.getElementById('modal-img');
const modalClose = document.getElementById('modal-close');
const btnPrev = document.getElementById('modal-prev');
const btnNext = document.getElementById('modal-next');
const btnPrevM = document.getElementById('modal-prev-m');
const btnNextM = document.getElementById('modal-next-m');

// State
let imageFiles = [];
let activeObjectUrls = [];
let currentModalIndex = 0;

// --- 1. Thumbnail & UI Logic ---

function renderThumbs() {
    // Clean up memory
    activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
    activeObjectUrls = [];
    thumbsContainer.innerHTML = '';

    imageFiles.forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        activeObjectUrls.push(url);

        const div = document.createElement('div');
        // Grid Item Style
        div.className = 'group relative aspect-square bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 hover:border-brand transition-all shadow-sm';
        
        div.innerHTML = `
            <img src="${url}" class="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer" onclick="openModal(${idx})" />
            
            <!-- Delete Button (Top Right) -->
            <button type="button" class="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white p-1 rounded-md backdrop-blur-sm transition-colors z-10" onclick="removeFile(${idx})">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>

            <!-- Expand Hint (Center - optional visual cue) -->
            <div class="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                    <i data-lucide="eye" class="w-5 h-5 text-white"></i>
                </div>
            </div>
        `;
        thumbsContainer.appendChild(div);
    });
    
    lucide.createIcons();
}

// Exposed to HTML
window.removeFile = (index) => {
    imageFiles.splice(index, 1);
    renderThumbs();
};

window.openModal = (index) => {
    currentModalIndex = index;
    updateModalImage();
    modalBg.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
};

// --- 2. Carousel Logic ---

function updateModalImage() {
    if (imageFiles.length === 0) return hideModal();
    // Wrap around index
    if (currentModalIndex < 0) currentModalIndex = imageFiles.length - 1;
    if (currentModalIndex >= imageFiles.length) currentModalIndex = 0;

    // We regenerate URL here to be safe, or look up from activeObjectUrls
    // Since renderThumbs runs often, activeObjectUrls[currentModalIndex] should be valid
    if (activeObjectUrls[currentModalIndex]) {
        modalImg.src = activeObjectUrls[currentModalIndex];
    }
}

function nextImage() {
    currentModalIndex++;
    updateModalImage();
}

function prevImage() {
    currentModalIndex--;
    updateModalImage();
}

function hideModal() {
    modalBg.classList.add('hidden');
    document.body.style.overflow = 'auto';
    modalImg.src = '';
}

// Event Listeners for Carousel
btnPrev.onclick = prevImage;
btnNext.onclick = nextImage;
btnPrevM.onclick = prevImage;
btnNextM.onclick = nextImage;
modalClose.onclick = hideModal;
modalBg.onclick = (e) => { if (e.target === modalBg) hideModal(); };
// Keyboard Nav
document.addEventListener('keydown', (e) => {
    if (modalBg.classList.contains('hidden')) return;
    if (e.key === 'Escape') hideModal();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
});


// --- 3. Input Handling ---

uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drop-active'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drop-active'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drop-active');
    handleNewFiles(e.dataTransfer.files);
});

selectBtn.onclick = () => fileInput.click();
fileInput.onchange = () => { handleNewFiles(fileInput.files); fileInput.value = ''; };

window.addEventListener('paste', e => {
    if (e.clipboardData && e.clipboardData.files.length) {
        handleNewFiles(e.clipboardData.files);
    }
});

function handleNewFiles(fileList) {
    for (const f of fileList) {
        if (f.type.startsWith('image/')) {
            imageFiles.push(f);
        }
    }
    renderThumbs();
}


// --- 4. Submission & State Management ---

form.addEventListener('submit', async e => {
    e.preventDefault();
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
    
    const urlList = imageUrlInput.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);

    if (!imageFiles.length && !urlList.length) {
        showError('Please upload an image or provide a URL first.');
        return;
    }

    // Loading State
    const originalBtnContent = runBtn.innerHTML;
    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="animate-spin mr-2"><i data-lucide="loader-2" class="w-5 h-5"></i></span> Processing...`;
    lucide.createIcons();

    const formData = new FormData();
    imageFiles.forEach(f => formData.append('images', f));
    if (urlList.length) formData.append('urls', JSON.stringify(urlList));

    try {
        const response = await fetch('/ocr', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        // --- SUCCESS STATE HANDLING ---
        // 1. Clear Results Stack to avoid appending to old runs (or keep if you prefer history)
        resultsStack.innerHTML = ''; 
        resultsStack.classList.remove('hidden');

        // 2. Render Results
        data.results.forEach(result => createResultCard(result));

        // 3. CLEAR INPUTS (As requested: don't combine with next run)
        imageFiles = []; 
        renderThumbs();
        imageUrlInput.value = '';

        // Scroll to results
        resultsStack.scrollIntoView({ behavior: 'smooth', block: 'start' });
        lucide.createIcons();

    } catch (err) {
        showError(err.message || 'An unknown error occurred.');
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = originalBtnContent;
        lucide.createIcons(); // Re-init icons for the button
    }
});

function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
}

function createResultCard(result) {
    const card = document.createElement('div');
    // Mobile: p-3, Rounded-xl. Desktop: p-5, Rounded-2xl
    card.className = 'glass rounded-xl sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 animate-[slideIn_0.4s_ease-out] border-l-4 border-l-brand';
    
    let contentHtml = '';
    if (result.error) {
        contentHtml = `<div class="bg-red-500/10 border border-red-500/20 text-red-400 p-3 sm:p-4 rounded-xl text-sm flex gap-2"><i data-lucide="alert-circle" class="w-5 h-5 flex-shrink-0"></i> ${result.error}</div>`;
    } else {
        const text = result.text.join('\n');
        // Mobile: p-3. Desktop: p-4.
        contentHtml = `
            <div class="relative group">
                <pre class="bg-zinc-950 text-zinc-300 p-3 sm:p-4 rounded-xl font-mono text-xs sm:text-sm overflow-x-auto border border-border leading-relaxed scrollbar-thin">${text || 'No text detected.'}</pre>
                <button class="copy-btn absolute top-2 right-2 sm:top-3 sm:right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-brand text-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-lg">
                    <i data-lucide="copy" class="w-3 h-3"></i> Copy
                </button>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="flex items-center justify-between border-b border-border pb-2 sm:pb-3">
            <div class="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <div class="bg-zinc-800 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <i data-lucide="${result.type === 'file' ? 'image' : 'link'}" class="text-brand w-4 h-4 sm:w-5 sm:h-5"></i>
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="font-bold text-sm text-zinc-200 truncate" title="${result.name}">${result.name}</span>
                    <span class="text-[10px] sm:text-xs text-zinc-500 font-mono">Processed in ${(result.time || 0).toFixed(2)}s</span>
                </div>
            </div>
        </div>
        ${contentHtml}
    `;

    // Copy Logic (Same as before)
    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const text = result.text.join('\n');
            navigator.clipboard.writeText(text);
            copyBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Copied!`;
            copyBtn.classList.add('bg-green-500', 'text-white');
            copyBtn.classList.remove('bg-brand', 'text-black');
            setTimeout(() => { 
                copyBtn.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> Copy`; 
                copyBtn.classList.remove('bg-green-500', 'text-white');
                copyBtn.classList.add('bg-brand', 'text-black');
                lucide.createIcons(); 
            }, 2000);
            lucide.createIcons();
        };
    }

    resultsStack.appendChild(card);
}

// Add keyframe animation style dynamically
const style = document.createElement('style');
style.innerHTML = `
@keyframes slideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);

// Helper to view single result image
window.viewResultImage = (src) => {
    const modalImg = document.getElementById('modal-img');
    const modalBg = document.getElementById('modal-bg');
    modalImg.src = src;
    modalBg.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

function createResultCard(result) {
    const card = document.createElement('div');
    // Mobile: p-3. Desktop: p-5.
    card.className = 'glass rounded-xl sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 animate-[slideIn_0.4s_ease-out] border-l-4 border-l-brand';
    
    // 1. Determine Image Source for Thumbnail
    let imgSrc = '';
    let isFile = result.type === 'file';
    
    if (isFile) {
        // Find the original file object to create a thumbnail URL
        // Note: imageFiles might be cleared, but we are running this loop BEFORE clearing in the submit handler.
        const file = imageFiles.find(f => f.name === result.name);
        if (file) {
            imgSrc = URL.createObjectURL(file);
        }
    } else {
        imgSrc = result.name; // It's a URL
    }

    // 2. Build Content HTML
    let contentHtml = '';
    if (result.error) {
        contentHtml = `<div class="bg-red-500/10 border border-red-500/20 text-red-400 p-3 sm:p-4 rounded-xl text-sm flex gap-2"><i data-lucide="alert-circle" class="w-5 h-5 flex-shrink-0"></i> ${result.error}</div>`;
    } else {
        const text = result.text.join('\n');
        contentHtml = `
            <div class="relative group">
                <pre class="bg-zinc-950 text-zinc-300 p-3 sm:p-4 rounded-xl font-mono text-xs sm:text-sm overflow-x-auto border border-border leading-relaxed scrollbar-thin max-h-96">${text || 'No text detected.'}</pre>
                <button class="copy-btn absolute top-2 right-2 sm:top-3 sm:right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-brand text-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-lg z-10">
                    <i data-lucide="copy" class="w-3 h-3"></i> Copy
                </button>
            </div>
        `;
    }

    // 3. Render Card
    // Replaced the Icon div with an <img> tag that triggers the modal
    card.innerHTML = `
        <div class="flex items-center justify-between border-b border-border pb-2 sm:pb-3">
            <div class="flex items-center gap-2 sm:gap-3 overflow-hidden">
                
                <!-- Thumbnail Image -->
                <div class="relative group/thumb flex-shrink-0 cursor-pointer" onclick="viewResultImage('${imgSrc}')">
                    <img src="${imgSrc}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-zinc-700 group-hover/thumb:border-brand transition-colors bg-zinc-800" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM1MjUyNWIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0ibTIxIDE1LTUtNS01IDUtMi0yLTMgMyIvPjwvc3ZnPg=='" />
                    <div class="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                         <i data-lucide="maximize-2" class="w-4 h-4 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-md"></i>
                    </div>
                </div>

                <div class="flex flex-col min-w-0">
                    <span class="font-bold text-sm text-zinc-200 truncate" title="${result.name}">${result.name}</span>
                    <span class="text-[10px] sm:text-xs text-zinc-500 font-mono">Processed in ${(result.time || 0).toFixed(2)}s</span>
                </div>
            </div>
        </div>
        ${contentHtml}
    `;

    // Copy Logic
    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const text = result.text.join('\n');
            navigator.clipboard.writeText(text);
            copyBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Copied!`;
            copyBtn.classList.add('bg-green-500', 'text-white');
            copyBtn.classList.remove('bg-brand', 'text-black');
            setTimeout(() => { 
                copyBtn.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> Copy`; 
                copyBtn.classList.remove('bg-green-500', 'text-white');
                copyBtn.classList.add('bg-brand', 'text-black');
                lucide.createIcons(); 
            }, 2000);
            lucide.createIcons();
        };
    }

    resultsStack.appendChild(card);
}
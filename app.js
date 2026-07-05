/* ==========================================================================
   cgTools - Image to Pixel Art Converter Core Logic
   ========================================================================== */

// 1. Color Palette Definitions
const PALETTES = {
  'gb-classic': [
    [15, 56, 15],     // Darkest green
    [48, 98, 48],     // Dark green
    [139, 172, 15],   // Light green
    [155, 188, 15]    // Lightest green
  ],
  'pico8': [
    [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
    [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
    [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
    [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]
  ],
  'nes': [
    [124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188],
    [148, 0, 132], [168, 0, 32], [168, 16, 0], [136, 20, 0],
    [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0],
    [0, 64, 88], [0, 0, 0], [188, 188, 188], [0, 112, 252],
    [0, 88, 248], [104, 56, 252], [216, 0, 204], [228, 0, 88],
    [248, 56, 0], [228, 92, 16], [172, 124, 0], [0, 184, 0],
    [0, 168, 0], [0, 168, 68], [0, 136, 136], [0, 0, 0],
    [248, 248, 248], [60, 188, 252], [104, 136, 252], [152, 120, 248],
    [248, 120, 248], [248, 88, 152], [248, 120, 88], [252, 160, 68],
    [248, 184, 0], [184, 248, 24], [88, 216, 84], [88, 248, 152],
    [0, 232, 216], [120, 120, 120], [252, 252, 252], [164, 228, 252],
    [184, 184, 252], [216, 184, 252], [248, 184, 252], [248, 164, 192],
    [240, 208, 176], [252, 224, 168], [248, 216, 120], [216, 248, 120],
    [184, 248, 184], [184, 248, 216], [0, 252, 252], [248, 216, 248]
  ],
  'sweetie16': [
    [26, 28, 44], [93, 39, 93], [177, 62, 83], [239, 125, 87],
    [255, 205, 117], [167, 240, 112], [56, 183, 100], [37, 113, 121],
    [41, 54, 111], [59, 93, 201], [65, 166, 246], [115, 239, 247],
    [244, 244, 244], [148, 176, 194], [86, 108, 134], [51, 60, 87]
  ],
  'c64': [
    [0, 0, 0], [255, 255, 255], [104, 55, 43], [112, 164, 178],
    [111, 61, 134], [88, 141, 67], [53, 40, 121], [184, 195, 92],
    [111, 82, 41], [67, 57, 0], [154, 103, 89], [68, 68, 68],
    [108, 108, 108], [154, 210, 132], [108, 94, 181], [149, 149, 149]
  ],
  'vaporwave': [
    [43, 15, 84], [171, 31, 101], [240, 89, 123], [247, 171, 228],
    [255, 233, 227], [9, 195, 219], [0, 130, 200], [0, 55, 133],
    [230, 0, 103], [26, 240, 222], [249, 237, 105], [240, 138, 93],
    [184, 59, 94], [106, 44, 112], [79, 138, 139], [255, 46, 99]
  ],
  'monochrome': [
    [0, 0, 0], [32, 32, 32], [64, 64, 64], [96, 96, 96],
    [128, 128, 128], [160, 160, 160], [192, 192, 192], [224, 224, 224],
    [255, 255, 255]
  ],
  'noir': [
    [0, 0, 0], [255, 255, 255]
  ]
};

// 2. Dithering Threshold Matrices
const BAYER_4X4 = [
  [ 0,  8,  2, 10 ],
  [ 12, 4,  14, 6 ],
  [ 3,  11, 1,  9 ],
  [ 15, 7,  13, 5 ]
];

const BAYER_8X8 = [
  [  0, 48, 12, 60,  3, 51, 15, 63 ],
  [ 32, 16, 44, 28, 35, 19, 47, 31 ],
  [  8, 56,  4, 52, 11, 59,  7, 55 ],
  [ 40, 24, 36, 20, 43, 27, 39, 23 ],
  [  2, 50, 14, 62,  1, 49, 13, 61 ],
  [ 34, 18, 46, 30, 33, 17, 45, 29 ],
  [ 10, 58,  6, 54,  9, 57,  5, 53 ],
  [ 42, 26, 38, 22, 41, 25, 37, 21 ]
];

// State Variables
let sourceImage = null;
let currentPaletteTab = 'custom'; // 'presets' or 'custom'
let processTimeout = null;
let spacePressed = false;
let originalSliderPercent = 50;

// Maximum dimensions for editing preview to maintain 60fps rendering
const MAX_PREVIEW_LIMIT = 800;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const btnRemoveFile = document.getElementById('btn-remove-file');

const workspaceEmpty = document.getElementById('workspace-empty');
const workspaceEditor = document.getElementById('workspace-editor');
const btnBrowseTrigger = document.getElementById('btn-browse-trigger');
const btnSampleTrigger = document.getElementById('btn-sample-trigger');

const canvasBefore = document.getElementById('canvas-before');
const canvasAfter = document.getElementById('canvas-after');
const ctxBefore = canvasBefore.getContext('2d');
const ctxAfter = canvasAfter.getContext('2d');

const comparisonSlider = document.getElementById('comparison-slider');
const afterPanel = document.getElementById('after-panel');
const sliderHandle = document.getElementById('slider-handle');
// Settings Profiles (Converter)
const selectConfigPreset = document.getElementById('select-config-preset');
const btnSaveConfig = document.getElementById('btn-save-config');
const btnDeleteConfig = document.getElementById('btn-delete-config');

// Navigation & Tools
const navVisualizer = document.getElementById('nav-visualizer');
const navConverter = document.getElementById('nav-converter');
const navCheckerboard = document.getElementById('nav-checkerboard');
const toolVisualizer = document.getElementById('tool-visualizer');
const toolConverter = document.getElementById('tool-converter');
const toolCheckerboard = document.getElementById('tool-checkerboard');

// Visualizer DOM
const selectVizRes = document.getElementById('select-viz-res');
const valCharWidth = document.getElementById('val-char-width');
const valCharHeight = document.getElementById('val-char-height');
const valTileSize = document.getElementById('val-tile-size');

const vizSvg = document.getElementById('viz-svg');
const vizGround = document.getElementById('viz-ground');
const vizGroundGrid = document.getElementById('viz-ground-grid');
const vizChar = document.getElementById('viz-char');
const vizGridPattern = document.getElementById('viz-grid');
const vizGridSolidPattern = document.getElementById('viz-grid-solid');
const vizSvgContainer = document.getElementById('viz-svg-container');

// Visualizer Zoom Controls
const btnVizZoomIn = document.getElementById('btn-viz-zoom-in');
const btnVizZoomOut = document.getElementById('btn-viz-zoom-out');
const btnVizZoomReset = document.getElementById('btn-viz-zoom-reset');

// Visualizer Sliders
const rangeCharWidth = document.getElementById('range-char-width');
const rangeCharHeight = document.getElementById('range-char-height');
const rangeTileSize = document.getElementById('range-tile-size');

// Settings Profiles (Visualizer)
const selectVizPreset = document.getElementById('select-viz-preset');
const btnSaveViz = document.getElementById('btn-save-viz');
const btnDeleteViz = document.getElementById('btn-delete-viz');

// Sliders and Selects
const rangeResolution = document.getElementById('range-resolution');
const valResolution = document.getElementById('val-resolution');
const btnRes320 = document.getElementById('btn-res-320');
const btnRes480 = document.getElementById('btn-res-480');

const tabPresets = document.getElementById('tab-presets');
const tabCustom = document.getElementById('tab-custom');
const tabContentPresets = document.getElementById('tab-content-presets');
const tabContentCustom = document.getElementById('tab-content-custom');
const selectPreset = document.getElementById('select-preset');
const rangeColorLimit = document.getElementById('range-color-limit');
const valColorLimit = document.getElementById('val-color-limit');
const paletteColorsPreview = document.getElementById('palette-colors-preview');

const selectDither = document.getElementById('select-dither');
const rangeDitherWeight = document.getElementById('range-dither-weight');
const valDitherWeight = document.getElementById('val-dither-weight');

const rangeBrightness = document.getElementById('range-brightness');
const valBrightness = document.getElementById('val-brightness');
const rangeContrast = document.getElementById('range-contrast');
const valContrast = document.getElementById('val-contrast');
const rangeSaturation = document.getElementById('range-saturation');
const valSaturation = document.getElementById('val-saturation');
const rangeSharpness = document.getElementById('range-sharpness');
const valSharpness = document.getElementById('val-sharpness');

const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');

const statusResolution = document.getElementById('status-resolution');
const statusColorsUsed = document.getElementById('status-colors-used');

/* ==========================================================================
   Initialization and Event Handling
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  initSettingsProfiles();
  initVisualizer();
  initCheckerboard();
  setupUploadListeners();
  setupSlidersAndControls();
  setupComparisonSlider();
  setupGlobalShortcuts();
  renderPalettePreview();
});

// Reset logic
btnReset.addEventListener('click', () => {
  rangeResolution.value = 256;
  selectPreset.value = 'none';
  rangeColorLimit.value = 30;
  selectDither.value = 'none';
  rangeDitherWeight.value = 80;
  rangeBrightness.value = 0;
  rangeContrast.value = 15;
  rangeSaturation.value = 15;
  rangeSharpness.value = 20;
  
  // Set tab to custom depth
  switchPaletteTab('custom');
  
  // Trigger update updates
  updateSliderLabels();
  renderPalettePreview();
  triggerPipeline();
  
  showToast('Settings reset to default', 'success');
});

// Download Logic
btnDownload.addEventListener('click', () => {
  if (!sourceImage) return;
  
  showToast('Rendering high resolution download...', 'success');
  
  // Run high-resolution render asynchronously so UI doesn't freeze
  setTimeout(() => {
    try {
      const targetWidth = parseInt(rangeResolution.value);
      const ratio = sourceImage.width / sourceImage.height;
      const downloadPixelatedW = targetWidth;
      const downloadPixelatedH = Math.max(2, Math.round(targetWidth / ratio));
      
      // Create offscreen high-res canvases
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = downloadPixelatedW;
      smallCanvas.height = downloadPixelatedH;
      const smallCtx = smallCanvas.getContext('2d');
      
      // Draw full image downscaled
      smallCtx.drawImage(sourceImage, 0, 0, downloadPixelatedW, downloadPixelatedH);
      const imgData = smallCtx.getImageData(0, 0, downloadPixelatedW, downloadPixelatedH);
      
      // Process pipeline at full size
      processImageData(imgData.data, downloadPixelatedW, downloadPixelatedH);
      smallCtx.putImageData(imgData, 0, 0);
      
      // Upscale back to full size (original uploaded dimensions) for sharp download
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = sourceImage.width;
      exportCanvas.height = sourceImage.height;
      const exportCtx = exportCanvas.getContext('2d');
      
      exportCtx.imageSmoothingEnabled = false;
      exportCtx.mozImageSmoothingEnabled = false;
      exportCtx.webkitImageSmoothingEnabled = false;
      exportCtx.msImageSmoothingEnabled = false;
      exportCtx.drawImage(smallCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
      
      // Convert to blob and download
      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cgtools-pixelart-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Image downloaded successfully!', 'success');
      }, 'image/png');
      
    } catch (err) {
      console.error(err);
      showToast('Export failed. Try a smaller image.', 'error');
    }
  }, 100);
});

/* ==========================================================================
   File Loading & Sample Image Generation
   ========================================================================== */

function setupUploadListeners() {
  // Click dropzone to browse
  btnBrowseTrigger.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag & drop handlers
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
    
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Global window drag and drop blocks (prevents page redirect if missed dropzone)
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  }, false);
  window.addEventListener('drop', (e) => {
    e.preventDefault();
  }, false);

  btnRemoveFile.addEventListener('click', () => {
    sourceImage = null;
    fileInput.value = '';
    workspaceEditor.classList.add('hidden');
    workspaceEmpty.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    btnDownload.disabled = true;
  });

  // Load sample image
  btnSampleTrigger.addEventListener('click', () => {
    loadSampleImage();
  });
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Invalid file format. Please upload an image.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      fileName.textContent = file.name;
      fileInfo.classList.remove('hidden');
      setupWorkspace();
      showToast('Image loaded successfully!', 'success');
    };
    img.onerror = () => {
      showToast('Error loading image.', 'error');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Generate an offline retro Vaporwave/Synthwave scene dynamically using 2D Canvas
function loadSampleImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  // Background gradient (Deep Space Violet/Blue)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 600);
  bgGrad.addColorStop(0, '#0d0221');
  bgGrad.addColorStop(0.5, '#0f0826');
  bgGrad.addColorStop(1, '#2f1154');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 800, 600);

  // Draw some stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 320;
    const size = Math.random() * 2 + 0.5;
    ctx.globalAlpha = Math.random();
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1.0;

  // Draw Cyber Sun (Retro stripes)
  const sunX = 400;
  const sunY = 280;
  const sunR = 120;
  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, '#ffec27');
  sunGrad.addColorStop(0.5, '#ff007f');
  sunGrad.addColorStop(1, '#7e2553');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Stripe cutouts in the sun (vaporwave aesthetic)
  ctx.fillStyle = '#0f0826';
  for (let y = sunY - 40; y < sunY + sunR; y += 12) {
    const height = Math.max(1, (y - (sunY - 40)) / 10 + 1.5);
    ctx.fillRect(sunX - sunR - 10, y, sunR * 2 + 20, height);
  }

  // Draw Neon Silhouette Mountains
  ctx.fillStyle = '#180736';
  ctx.beginPath();
  ctx.moveTo(0, 360);
  ctx.lineTo(150, 240);
  ctx.lineTo(300, 360);
  ctx.lineTo(480, 200);
  ctx.lineTo(650, 360);
  ctx.lineTo(800, 360);
  ctx.lineTo(800, 600);
  ctx.lineTo(0, 600);
  ctx.fill();

  // Mountain Neon stroke
  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 360);
  ctx.lineTo(150, 240);
  ctx.lineTo(300, 360);
  ctx.lineTo(480, 200);
  ctx.lineTo(650, 360);
  ctx.lineTo(800, 360);
  ctx.stroke();

  // Foreground Grid Floor
  const gridY = 360;
  ctx.fillStyle = '#080114';
  ctx.fillRect(0, gridY, 800, 240);

  // Perspective Grid Lines
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  const numLines = 18;
  for (let i = 0; i <= numLines; i++) {
    const startX = (i / numLines) * 800;
    const endX = -400 + (i / numLines) * 1600; // expand at the bottom
    ctx.beginPath();
    ctx.moveTo(startX, gridY);
    ctx.lineTo(endX, 600);
    ctx.stroke();
  }

  // Horizontal Grid Lines (narrowing to the horizon)
  for (let y = gridY; y < 600; y += 15) {
    // Math to get nice acceleration spacing
    const progress = (y - gridY) / 240;
    const spacing = gridY + (progress ** 1.8) * 240;
    ctx.beginPath();
    ctx.moveTo(0, spacing);
    ctx.lineTo(800, spacing);
    ctx.stroke();
  }

  // Glow sphere overlay on top of grid lines
  const groundGlow = ctx.createLinearGradient(0, gridY, 0, 600);
  groundGlow.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
  groundGlow.addColorStop(0.4, 'rgba(236, 72, 153, 0.08)');
  groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, gridY, 800, 240);

  // Convert canvas to Image
  const img = new Image();
  img.onload = () => {
    sourceImage = img;
    fileName.textContent = 'synthwave_sample.png';
    fileInfo.classList.remove('hidden');
    setupWorkspace();
    showToast('Loaded sample image', 'success');
  };
  img.src = canvas.toDataURL('image/png');
}

/* ==========================================================================
   Workspace Render & Pipelines
   ========================================================================== */

function setupWorkspace() {
  workspaceEmpty.classList.add('hidden');
  workspaceEditor.classList.remove('hidden');
  btnDownload.disabled = false;
  
  // Set up preview sizes matching aspect ratio
  const ratio = sourceImage.width / sourceImage.height;
  
  let previewW = sourceImage.width;
  let previewH = sourceImage.height;
  
  if (previewW > MAX_PREVIEW_LIMIT || previewH > MAX_PREVIEW_LIMIT) {
    if (ratio > 1) {
      previewW = MAX_PREVIEW_LIMIT;
      previewH = Math.round(MAX_PREVIEW_LIMIT / ratio);
    } else {
      previewH = MAX_PREVIEW_LIMIT;
      previewW = Math.round(MAX_PREVIEW_LIMIT * ratio);
    }
  }
  
  // Size canvases exactly the same
  canvasBefore.width = previewW;
  canvasBefore.height = previewH;
  canvasAfter.width = previewW;
  canvasAfter.height = previewH;
  
  // Draw before canvas
  ctxBefore.drawImage(sourceImage, 0, 0, previewW, previewH);
  
  // Reset slider handle to center and reset zoom/pan
  updateSlider(50);
  resetZoomPan();
  
  // Run pixel art conversion
  runPipeline();
}

// Triggers pipeline with debounce (keeps slider dragging extremely fast)
function triggerPipeline() {
  if (!sourceImage) return;
  
  if (processTimeout) {
    clearTimeout(processTimeout);
  }
  
  processTimeout = setTimeout(() => {
    runPipeline();
  }, 16); // ~60fps debounce window
}

function runPipeline() {
  if (!sourceImage) return;
  
  const startTime = performance.now();
  const targetWidth = parseInt(rangeResolution.value);
  const w = canvasAfter.width;
  const h = canvasAfter.height;
  const ratio = w / h;
  
  // Calculate small processing width/height based on target resolution width
  const pixelatedW = targetWidth;
  const pixelatedH = Math.max(2, Math.round(targetWidth / ratio));
  
  // Update status bar resolution
  statusResolution.textContent = `${sourceImage.width} × ${sourceImage.height} px (${pixelatedW} × ${pixelatedH} blocks)`;
  
  // Create small offscreen canvas to scale down
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = pixelatedW;
  smallCanvas.height = pixelatedH;
  const smallCtx = smallCanvas.getContext('2d');
  
  // Draw the before-canvas contents scaled down
  smallCtx.drawImage(canvasBefore, 0, 0, pixelatedW, pixelatedH);
  const imgData = smallCtx.getImageData(0, 0, pixelatedW, pixelatedH);
  
  // Process colors/dithering on raw downscaled pixel array
  const uniqueColorCount = processImageData(imgData.data, pixelatedW, pixelatedH);
  
  // Update status bar unique colors
  statusColorsUsed.textContent = `${uniqueColorCount} unique colors used`;
  
  // Put data back and render to preview canvas
  smallCtx.putImageData(imgData, 0, 0);
  
  ctxAfter.imageSmoothingEnabled = false;
  ctxAfter.mozImageSmoothingEnabled = false;
  ctxAfter.webkitImageSmoothingEnabled = false;
  ctxAfter.msImageSmoothingEnabled = false;
  
  ctxAfter.clearRect(0, 0, w, h);
  ctxAfter.drawImage(smallCanvas, 0, 0, w, h);
  
  const timeTaken = (performance.now() - startTime).toFixed(1);
  console.log(`Pipeline complete in ${timeTaken}ms`);
}

/* ==========================================================================
   Core Image Processing & Math Algorithms
   ========================================================================== */

function processImageData(data, width, height) {
  const brightness = parseInt(rangeBrightness.value);
  const contrast = parseInt(rangeContrast.value);
  const saturation = parseInt(rangeSaturation.value);
  const sharpness = parseInt(rangeSharpness.value);
  
  // 1. Sharpen Filter (Applied first on the low-res cells to define borders)
  if (sharpness > 0) {
    applySharpen(data, width, height, sharpness);
  }
  
  // 2. Adjustments (Brightness, Contrast, Saturation)
  applyAdjustments(data, brightness, contrast, saturation);
  
  // 3. Palette Setup
  let palette = [];
  const presetMode = currentPaletteTab === 'presets';
  const presetType = selectPreset.value;
  
  if (presetMode) {
    if (presetType === 'none') {
      // If "No Limit" is selected, we bypass mapping/dithering steps
      // Count unique colors directly
      return countUniqueColors(data);
    }
    palette = PALETTES[presetType] || PALETTES['gb-classic'];
  } else {
    // Generate KMeans palette dynamically based on image content
    const k = parseInt(rangeColorLimit.value);
    palette = generateKMeansPalette(data, k);
  }
  
  // 4. Color Quantization + Dithering
  const ditherType = selectDither.value;
  const ditherWeight = parseInt(rangeDitherWeight.value) / 100;
  
  if (ditherType.startsWith('bayer')) {
    const is8x8 = ditherType === 'bayer-8x8';
    applyBayerDithering(data, width, height, palette, ditherWeight, is8x8);
  } else if (ditherType === 'floyd-steinberg') {
    applyFloydSteinbergDithering(data, width, height, palette, ditherWeight);
  } else {
    // None / Flat blocks mapping
    applyNearestPaletteColor(data, palette);
  }
  
  // Final count of colors
  return countUniqueColors(data);
}

// Standard convolution edge-sharpening
function applySharpen(data, width, height, amount) {
  const mix = amount / 100; 
  const s = mix * 0.45; // cap kernel strength
  const w = 1 + 4 * s;
  const original = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        const top = ((y - 1) * width + x) * 4 + c;
        const bottom = ((y + 1) * width + x) * 4 + c;
        const left = (y * width + (x - 1)) * 4 + c;
        const right = (y * width + (x + 1)) * 4 + c;
        const center = idx + c;
        
        let val = original[center] * w - (original[top] + original[bottom] + original[left] + original[right]) * s;
        data[center] = val < 0 ? 0 : (val > 255 ? 255 : val);
      }
    }
  }
}

// Adjust basic image parameters
function applyAdjustments(data, brightness, contrast, saturation) {
  const b = brightness * 2.55; // convert -100..100 scale to pixel space
  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const sFactor = 1 + (saturation / 100);
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i+1];
    let bVal = data[i+2];
    
    // Brightness
    if (brightness !== 0) {
      r += b;
      g += b;
      bVal += b;
    }
    
    // Contrast
    if (contrast !== 0) {
      r = cFactor * (r - 128) + 128;
      g = cFactor * (g - 128) + 128;
      bVal = cFactor * (bVal - 128) + 128;
    }
    
    // Saturation
    if (saturation !== 0) {
      const L = 0.299 * r + 0.587 * g + 0.114 * bVal; // luminance formula
      r = L + (r - L) * sFactor;
      g = L + (g - L) * sFactor;
      bVal = L + (bVal - L) * sFactor;
    }
    
    // Clamp values
    data[i] = r < 0 ? 0 : (r > 255 ? 255 : r);
    data[i+1] = g < 0 ? 0 : (g > 255 ? 255 : g);
    data[i+2] = bVal < 0 ? 0 : (bVal > 255 ? 255 : bVal);
  }
}

// Fast K-Means Palette Generation
function generateKMeansPalette(pixels, k) {
  const samples = [];
  const step = Math.max(1, Math.floor(pixels.length / 4 / 1200)); // Sample ~1200 pixels
  for (let i = 0; i < pixels.length; i += 4 * step) {
    samples.push([pixels[i], pixels[i+1], pixels[i+2]]);
  }
  
  if (samples.length === 0) return [[0,0,0], [255,255,255]];
  
  // Pick random samples for initial centers
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const randomIdx = Math.floor(Math.random() * samples.length);
    centroids.push([...samples[randomIdx]]);
  }
  
  // Run 3 iterations (keeps it sub-millisecond)
  for (let iter = 0; iter < 3; iter++) {
    const clusters = Array.from({ length: k }, () => []);
    
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      let minDist = Infinity;
      let closestIdx = 0;
      
      for (let j = 0; j < k; j++) {
        const c = centroids[j];
        const dist = (sample[0] - c[0])**2 + (sample[1] - c[1])**2 + (sample[2] - c[2])**2;
        if (dist < minDist) {
          minDist = dist;
          closestIdx = j;
        }
      }
      clusters[closestIdx].push(sample);
    }
    
    for (let j = 0; j < k; j++) {
      const cluster = clusters[j];
      if (cluster.length > 0) {
        let sumR = 0, sumG = 0, sumB = 0;
        for (let p = 0; p < cluster.length; p++) {
          sumR += cluster[p][0];
          sumG += cluster[p][1];
          sumB += cluster[p][2];
        }
        centroids[j] = [
          Math.round(sumR / cluster.length),
          Math.round(sumG / cluster.length),
          Math.round(sumB / cluster.length)
        ];
      } else {
        // Handle empty cluster
        const randomIdx = Math.floor(Math.random() * samples.length);
        centroids[j] = [...samples[randomIdx]];
      }
    }
  }
  return centroids;
}

// Flat palette replacement (No dithering)
function applyNearestPaletteColor(data, palette) {
  const cache = new Map();
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    const key = (r << 16) | (g << 8) | b;
    let closest;
    
    if (cache.has(key)) {
      closest = cache.get(key);
    } else {
      let minDist = Infinity;
      closest = palette[0];
      for (let j = 0; j < palette.length; j++) {
        const c = palette[j];
        const dist = (r - c[0])**2 + (g - c[1])**2 + (b - c[2])**2;
        if (dist < minDist) {
          minDist = dist;
          closest = c;
        }
      }
      cache.set(key, closest);
    }
    
    data[i]   = closest[0];
    data[i+1] = closest[1];
    data[i+2] = closest[2];
  }
}

// Bayer (Ordered Grid) Dithering
function applyBayerDithering(data, width, height, palette, ditherWeight, is8x8) {
  const matrix = is8x8 ? BAYER_8X8 : BAYER_4X4;
  const modSize = is8x8 ? 8 : 4;
  const normFactor = is8x8 ? 64 : 16;
  const cache = new Map();
  
  const step = 255 / Math.pow(palette.length, 1/3); // Scaling factor based on palette depth
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      
      const threshold = (matrix[y % modSize][x % modSize] / normFactor) - 0.5;
      const offset = threshold * ditherWeight * step;
      
      const adjR = Math.max(0, Math.min(255, Math.round(r + offset)));
      const adjG = Math.max(0, Math.min(255, Math.round(g + offset)));
      const adjB = Math.max(0, Math.min(255, Math.round(b + offset)));
      
      const key = (adjR << 16) | (adjG << 8) | adjB;
      let closest;
      
      if (cache.has(key)) {
        closest = cache.get(key);
      } else {
        let minDist = Infinity;
        closest = palette[0];
        for (let j = 0; j < palette.length; j++) {
          const c = palette[j];
          const dist = (adjR - c[0])**2 + (adjG - c[1])**2 + (adjB - c[2])**2;
          if (dist < minDist) {
            minDist = dist;
            closest = c;
          }
        }
        cache.set(key, closest);
      }
      
      data[idx]   = closest[0];
      data[idx+1] = closest[1];
      data[idx+2] = closest[2];
    }
  }
}

// Floyd-Steinberg Error Diffusion Dithering
function applyFloydSteinbergDithering(data, width, height, palette, ditherWeight) {
  const cache = new Map();
  
  // Allocate float buffer to prevent rounding drift during error dispersion
  const buffer = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    buffer[i] = data[i];
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const oldR = buffer[idx];
      const oldG = buffer[idx+1];
      const oldB = buffer[idx+2];
      
      const rClamped = Math.max(0, Math.min(255, Math.round(oldR)));
      const gClamped = Math.max(0, Math.min(255, Math.round(oldG)));
      const bClamped = Math.max(0, Math.min(255, Math.round(oldB)));
      
      const key = (rClamped << 16) | (gClamped << 8) | bClamped;
      let closest;
      
      if (cache.has(key)) {
        closest = cache.get(key);
      } else {
        let minDist = Infinity;
        closest = palette[0];
        for (let j = 0; j < palette.length; j++) {
          const c = palette[j];
          const dist = (rClamped - c[0])**2 + (gClamped - c[1])**2 + (bClamped - c[2])**2;
          if (dist < minDist) {
            minDist = dist;
            closest = c;
          }
        }
        cache.set(key, closest);
      }
      
      const newR = closest[0];
      const newG = closest[1];
      const newB = closest[2];
      
      data[idx]   = newR;
      data[idx+1] = newG;
      data[idx+2] = newB;
      
      const errR = (oldR - newR) * ditherWeight;
      const errG = (oldG - newG) * ditherWeight;
      const errB = (oldB - newB) * ditherWeight;
      
      // Diffuse errors using classic 7/16, 3/16, 5/16, 1/16 coefficients
      if (x + 1 < width) {
        const nIdx = idx + 4;
        buffer[nIdx]   += errR * (7/16);
        buffer[nIdx+1] += errG * (7/16);
        buffer[nIdx+2] += errB * (7/16);
      }
      
      if (y + 1 < height) {
        if (x - 1 >= 0) {
          const nIdx = ((y + 1) * width + (x - 1)) * 4;
          buffer[nIdx]   += errR * (3/16);
          buffer[nIdx+1] += errG * (3/16);
          buffer[nIdx+2] += errB * (3/16);
        }
        {
          const nIdx = ((y + 1) * width + x) * 4;
          buffer[nIdx]   += errR * (5/16);
          buffer[nIdx+1] += errG * (5/16);
          buffer[nIdx+2] += errB * (5/16);
        }
        if (x + 1 < width) {
          const nIdx = ((y + 1) * width + (x + 1)) * 4;
          buffer[nIdx]   += errR * (1/16);
          buffer[nIdx+1] += errG * (1/16);
          buffer[nIdx+2] += errB * (1/16);
        }
      }
    }
  }
}

// Utility to count exact unique colors on the canvas
function countUniqueColors(data) {
  const colors = new Set();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i+1] << 8) | data[i+2];
    colors.add(key);
  }
  return colors.size;
}

/* ==========================================================================
   UI Helpers: Labels, Tabs and Custom Palette Previews
   ========================================================================== */

function setupSlidersAndControls() {
  const sliders = [
    { el: rangeResolution, valEl: valResolution },
    { el: rangeColorLimit, valEl: valColorLimit },
    { el: rangeDitherWeight, valEl: valDitherWeight },
    { el: rangeBrightness, valEl: valBrightness },
    { el: rangeContrast, valEl: valContrast },
    { el: rangeSaturation, valEl: valSaturation },
    { el: rangeSharpness, valEl: valSharpness }
  ];

  // Set up listeners for updating numbers next to range sliders
  sliders.forEach(slider => {
    // Inject spin controls if this is an input
    if (slider.valEl.tagName === 'INPUT') {
      const container = slider.valEl.closest('.input-with-suffix');
      if (container && !container.querySelector('.spin-controls')) {
        const spinControls = document.createElement('div');
        spinControls.className = 'spin-controls';
        spinControls.innerHTML = `
          <button class="spin-up">▲</button>
          <button class="spin-down">▼</button>
        `;
        container.appendChild(spinControls);

        const btnUp = spinControls.querySelector('.spin-up');
        const btnDown = spinControls.querySelector('.spin-down');

        const stepVal = (dir) => {
          let val = parseInt(slider.valEl.value) || 0;
          val += dir;
          
          const min = parseInt(slider.valEl.min);
          const max = parseInt(slider.valEl.max);
          if (val < min) val = min;
          if (val > max) val = max;
          
          slider.valEl.value = val;
          slider.el.value = val;
          triggerPipeline();
        };

        btnUp.addEventListener('click', () => stepVal(1));
        btnDown.addEventListener('click', () => stepVal(-1));
      }
    }

    // When range slider changes, update number input
    slider.el.addEventListener('input', () => {
      slider.valEl.value = slider.el.value;
      triggerPipeline();
    });

    // When number input changes, update range slider
    slider.valEl.addEventListener('input', () => {
      let val = parseInt(slider.valEl.value);
      if (isNaN(val)) return;
      
      // Enforce bounds
      const min = parseInt(slider.el.min);
      const max = parseInt(slider.el.max);
      if (val < min) val = min;
      if (val > max) val = max;
      
      slider.el.value = val;
      triggerPipeline();
    });
    
    // Auto-correct out-of-bounds on blur
    slider.valEl.addEventListener('blur', () => {
      slider.valEl.value = slider.el.value;
    });
  });

  // Tab switcher for Palette types
  tabPresets.addEventListener('click', () => switchPaletteTab('presets'));
  tabCustom.addEventListener('click', () => switchPaletteTab('custom'));
  
  selectPreset.addEventListener('change', () => {
    renderPalettePreview();
    triggerPipeline();
  });

  selectDither.addEventListener('change', () => {
    // Hide dither weight control if dithering is turned off
    const parentRange = rangeDitherWeight.closest('.range-container');
    if (selectDither.value === 'none') {
      parentRange.classList.add('hidden');
    } else {
      parentRange.classList.remove('hidden');
    }
    triggerPipeline();
  });

  // Quick Resolution Buttons
  btnRes320.addEventListener('click', () => {
    rangeResolution.value = 320;
    valResolution.value = 320;
    triggerPipeline();
  });
  
  btnRes480.addEventListener('click', () => {
    rangeResolution.value = 480;
    valResolution.value = 480;
    triggerPipeline();
  });
}

function updateSliderLabels() {
  valResolution.value = rangeResolution.value;
  valColorLimit.value = rangeColorLimit.value;
  valDitherWeight.value = rangeDitherWeight.value;
  valBrightness.value = rangeBrightness.value;
  valContrast.value = rangeContrast.value;
  valSaturation.value = rangeSaturation.value;
  valSharpness.value = rangeSharpness.value;
  
  const parentRange = rangeDitherWeight.closest('.range-container');
  if (selectDither.value === 'none') {
    parentRange.classList.add('hidden');
  } else {
    parentRange.classList.remove('hidden');
  }
}

function switchPaletteTab(tabName) {
  currentPaletteTab = tabName;
  if (tabName === 'presets') {
    tabPresets.classList.add('active');
    tabCustom.classList.remove('active');
    tabContentPresets.classList.remove('hidden');
    tabContentCustom.classList.add('hidden');
  } else {
    tabPresets.classList.remove('active');
    tabCustom.classList.add('active');
    tabContentPresets.classList.add('hidden');
    tabContentCustom.classList.remove('hidden');
  }
  triggerPipeline();
}

function renderPalettePreview() {
  paletteColorsPreview.innerHTML = '';
  const presetVal = selectPreset.value;
  
  if (presetVal === 'none' || !PALETTES[presetVal]) {
    paletteColorsPreview.style.display = 'none';
    return;
  }
  
  paletteColorsPreview.style.display = 'grid';
  const colors = PALETTES[presetVal];
  
  colors.forEach(rgb => {
    const dot = document.createElement('div');
    dot.className = 'palette-color-dot';
    dot.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    dot.title = `RGB: ${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
    paletteColorsPreview.appendChild(dot);
  });
}

/* ==========================================================================
   Interactive Comparison Slider & Keyboard Shortcuts
   ========================================================================== */

// Zoom & Pan Variables
let zoom = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

function applyZoomPan() {
  zoom = Math.max(0.5, Math.min(10.0, zoom));
  comparisonSlider.style.transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;
  document.getElementById('zoom-level-label').textContent = `${Math.round(zoom * 100)}%`;
}

function resetZoomPan() {
  zoom = 1.0;
  panX = 0;
  panY = 0;
  applyZoomPan();
}

function setupComparisonSlider() {
  let isDragging = false;

  function onDragStart(e) {
    if (e.button === 0 && !spacePressed) {
      isDragging = true;
      e.preventDefault();
    }
  }

  function onDragEnd() {
    isDragging = false;
  }

  function onDrag(e) {
    if (!isDragging || !sourceImage || isPanning) return;
    
    const rect = comparisonSlider.getBoundingClientRect();
    let clientX = e.clientX;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    }
    
    const x = (clientX - rect.left);
    const percent = (x / rect.width) * 100;
    updateSlider(percent);
  }

  // Mouse Listeners
  comparisonSlider.addEventListener('mousedown', onDragStart);
  window.addEventListener('mouseup', onDragEnd);
  window.addEventListener('mousemove', onDrag);

  // Touch Listeners
  comparisonSlider.addEventListener('touchstart', onDragStart, { passive: true });
  window.addEventListener('touchend', onDragEnd);
  window.addEventListener('touchmove', onDrag, { passive: true });

  // Pan controls mouse listeners (Right click, middle click, or Left click + Space)
  comparisonSlider.addEventListener('contextmenu', (e) => e.preventDefault()); // prevent right click menu
  
  comparisonSlider.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && spacePressed)) {
      isPanning = true;
      startPanX = e.clientX - panX * zoom;
      startPanY = e.clientY - panY * zoom;
      comparisonSlider.style.cursor = 'grabbing';
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // use capture to intercept handles

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = (e.clientX - startPanX) / zoom;
    panY = (e.clientY - startPanY) / zoom;
    applyZoomPan();
    e.preventDefault();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      comparisonSlider.style.cursor = 'ew-resize';
    }
  });

  // Wheel zoom listener
  comparisonSlider.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    if (e.deltaY < 0) {
      zoom += zoomFactor;
    } else {
      zoom -= zoomFactor;
    }
    applyZoomPan();
  }, { passive: false });

  // Setup toolbar zoom buttons
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    zoom += 0.25;
    applyZoomPan();
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    zoom -= 0.25;
    applyZoomPan();
  });

  document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    resetZoomPan();
  });
}

function updateSlider(percent) {
  percent = Math.max(0, Math.min(100, percent));
  sliderHandle.style.left = `${percent}%`;
  afterPanel.style.clipPath = `polygon(${percent}% 0, 100% 0, 100% 100%, ${percent}% 100%)`;
  
  // Store percent unless space is held
  if (!spacePressed) {
    originalSliderPercent = percent;
  }
}

// Hotkeys like Spacebar to show original
function setupGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spacePressed && sourceImage) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }
      e.preventDefault();
      spacePressed = true;
      
      // Temporarily hide pixel art by sliding handle to 100% (reveals only original left panel)
      updateSlider(100);
      comparisonSlider.style.cursor = 'grab';
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spacePressed && sourceImage) {
      spacePressed = false;
      // Restore previous handle percentage
      updateSlider(originalSliderPercent);
      comparisonSlider.style.cursor = 'ew-resize';
    }
  });
}

/* ==========================================================================
   UI Helpers & Version Checker
   ========================================================================== */

function showToast(message, type = 'info', htmlContent = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  if (htmlContent) {
    toast.innerHTML = htmlContent;
  } else {
    toast.innerHTML = `<span>${message}</span>`;
  }
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  if (type !== 'update') {
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

/* ==========================================================================
   Settings Profiles
   ========================================================================== */

function initSettingsProfiles() {
  loadProfilesToDropdown();

  selectConfigPreset.addEventListener('change', (e) => {
    const profileName = e.target.value;
    if (profileName === 'default') {
      btnReset.click();
    } else {
      const profiles = getSavedProfiles();
      const profile = profiles[profileName];
      if (profile) {
        applyProfile(profile);
      }
    }
  });

  btnSaveConfig.addEventListener('click', () => {
    const name = prompt('Enter a name for this Settings Profile:');
    if (!name || name.trim() === '' || name.trim().toLowerCase() === 'default') return;
    
    const profile = {
      resolution: rangeResolution.value,
      presetTab: currentPaletteTab,
      presetSelect: selectPreset.value,
      colorLimit: rangeColorLimit.value,
      dither: selectDither.value,
      ditherWeight: rangeDitherWeight.value,
      brightness: rangeBrightness.value,
      contrast: rangeContrast.value,
      saturation: rangeSaturation.value,
      sharpness: rangeSharpness.value
    };
    
    const profiles = getSavedProfiles();
    profiles[name.trim()] = profile;
    localStorage.setItem('cgtools_profiles', JSON.stringify(profiles));
    
    loadProfilesToDropdown(name.trim());
    showToast(`Profile "${name.trim()}" saved!`, 'success');
  });

  btnDeleteConfig.addEventListener('click', () => {
    const name = selectConfigPreset.value;
    if (name === 'default') {
      showToast('Cannot delete the default profile', 'error');
      return;
    }
    
    if (confirm(`Are you sure you want to delete the profile "${name}"?`)) {
      const profiles = getSavedProfiles();
      delete profiles[name];
      localStorage.setItem('cgtools_profiles', JSON.stringify(profiles));
      
      loadProfilesToDropdown('default');
      btnReset.click();
      showToast(`Profile "${name}" deleted!`, 'info');
    }
  });
}

function getSavedProfiles() {
  const data = localStorage.getItem('cgtools_profiles');
  return data ? JSON.parse(data) : {};
}

function loadProfilesToDropdown(selected = null) {
  const profiles = getSavedProfiles();
  
  selectConfigPreset.innerHTML = '<option value="default">Default</option>';
  
  for (const name of Object.keys(profiles)) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    selectConfigPreset.appendChild(option);
  }
  
  if (selected) {
    selectConfigPreset.value = selected;
  }
}

function applyProfile(p) {
  rangeResolution.value = p.resolution;
  
  if (p.presetTab === 'presets') {
    selectPreset.value = p.presetSelect;
    switchPaletteTab('presets');
  } else {
    rangeColorLimit.value = p.colorLimit;
    switchPaletteTab('custom');
  }
  
  selectDither.value = p.dither;
  rangeDitherWeight.value = p.ditherWeight;
  rangeBrightness.value = p.brightness;
  rangeContrast.value = p.contrast;
  rangeSaturation.value = p.saturation;
  rangeSharpness.value = p.sharpness;
  
  updateSliderLabels();
  renderPalettePreview();
  triggerPipeline();
  
  showToast('Profile loaded', 'success');
}

/* ==========================================================================
   Visualizer Tool
   ========================================================================== */
function setupNavigation() {
  const tabs = [
    { nav: navVisualizer, tool: toolVisualizer },
    { nav: navConverter, tool: toolConverter },
    { nav: navCheckerboard, tool: toolCheckerboard }
  ];

  tabs.forEach(tab => {
    tab.nav.addEventListener('click', () => {
      tabs.forEach(t => {
        t.nav.classList.remove('active');
        t.tool.classList.add('tool-hidden');
      });
      tab.nav.classList.add('active');
      tab.tool.classList.remove('tool-hidden');
    });
  });
}

function initVisualizer() {
  const updateVisualizer = () => {
    // 1. Get Game Resolution
    const resValue = selectVizRes.value;
    const [w, h] = resValue.split(',').map(Number);
    
    // Update SVG viewBox
    vizSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    
    // Set actual container size for zooming
    vizSvgContainer.style.width = `${w}px`;
    vizSvgContainer.style.height = `${h}px`;
    
    // 2. Get Character Size
    const charW = parseInt(valCharWidth.value) || 30;
    const charH = parseInt(valCharHeight.value) || 50;
    
    // Position character ~30% from the bottom of the screen
    const groundLevelY = Math.floor(h * 0.7); 
    const charX = Math.floor((w - charW) / 2); // Centered horizontally
    const charY = groundLevelY - charH;
    
    vizChar.setAttribute('width', charW);
    vizChar.setAttribute('height', charH);
    vizChar.setAttribute('x', charX);
    vizChar.setAttribute('y', charY);
    
    // 3. Update Tileset Grid / Ground
    const tileSize = parseInt(valTileSize.value) || 16;
    
    // The ground starts immediately below the character
    const groundHeight = h - groundLevelY;
    
    vizGround.setAttribute('y', groundLevelY);
    vizGround.setAttribute('height', groundHeight);
    
    vizGroundGrid.setAttribute('y', groundLevelY);
    vizGroundGrid.setAttribute('height', groundHeight);
    
    // Update SVG patterns to reflect new tile size
    vizGridPattern.setAttribute('width', tileSize);
    vizGridPattern.setAttribute('height', tileSize);
    vizGridPattern.querySelector('rect').setAttribute('width', tileSize);
    vizGridPattern.querySelector('rect').setAttribute('height', tileSize);
    
    vizGridSolidPattern.setAttribute('width', tileSize);
    vizGridSolidPattern.setAttribute('height', tileSize);
    vizGridSolidPattern.querySelector('rect').setAttribute('width', tileSize);
    vizGridSolidPattern.querySelector('rect').setAttribute('height', tileSize);
  };
  
  selectVizRes.addEventListener('change', updateVisualizer);

  // Slider & Input syncing
  const setupVizSlider = (rangeEl, valEl) => {
    // When range changes
    rangeEl.addEventListener('input', () => {
      valEl.value = rangeEl.value;
      updateVisualizer();
    });
    // When number changes
    valEl.addEventListener('input', () => {
      let val = parseInt(valEl.value);
      if (isNaN(val)) return;
      const min = parseInt(rangeEl.min) || 1;
      const max = parseInt(rangeEl.max) || 256;
      if (val < min) val = min;
      if (val > max) val = max;
      rangeEl.value = val;
      updateVisualizer();
    });
    valEl.addEventListener('blur', () => {
      valEl.value = rangeEl.value;
    });
  };

  setupVizSlider(rangeCharWidth, valCharWidth);
  setupVizSlider(rangeCharHeight, valCharHeight);
  setupVizSlider(rangeTileSize, valTileSize);
  
  // Custom spin controls for Visualizer inputs
  const setupSpinControls = (inputEl, rangeEl) => {
    const container = inputEl.closest('.input-with-suffix');
    if (container && !container.querySelector('.spin-controls')) {
      const spinControls = document.createElement('div');
      spinControls.className = 'spin-controls';
      spinControls.innerHTML = `
        <button class="spin-up">▲</button>
        <button class="spin-down">▼</button>
      `;
      container.appendChild(spinControls);

      const btnUp = spinControls.querySelector('.spin-up');
      const btnDown = spinControls.querySelector('.spin-down');

      const stepVal = (dir) => {
        let val = parseInt(inputEl.value) || 0;
        val += dir;
        const min = parseInt(inputEl.min) || 1;
        const max = parseInt(inputEl.max) || 256;
        if (val < min) val = min;
        if (val > max) val = max;
        
        inputEl.value = val;
        rangeEl.value = val;
        updateVisualizer();
      };

      btnUp.addEventListener('click', () => stepVal(1));
      btnDown.addEventListener('click', () => stepVal(-1));
    }
  };
  
  setupSpinControls(valCharWidth, rangeCharWidth);
  setupSpinControls(valCharHeight, rangeCharHeight);
  setupSpinControls(valTileSize, rangeTileSize);

  // Zoom Logic
  let currentVizZoom = 1;
  const updateVizZoom = () => {
    vizSvgContainer.style.transform = `scale(${currentVizZoom})`;
    btnVizZoomReset.textContent = `${Math.round(currentVizZoom * 100)}%`;
  };
  
  const fitZoomToScreen = (w, h) => {
    // Attempt to fill an 800x500 area
    const scaleX = 800 / w;
    const scaleY = 500 / h;
    let targetZoom = Math.min(scaleX, scaleY);
    // Round to nearest 0.25
    targetZoom = Math.max(0.5, Math.floor(targetZoom * 4) / 4);
    currentVizZoom = targetZoom;
    updateVizZoom();
  };

  btnVizZoomIn.addEventListener('click', () => {
    currentVizZoom += 0.25;
    updateVizZoom();
  });

  btnVizZoomOut.addEventListener('click', () => {
    currentVizZoom = Math.max(0.25, currentVizZoom - 0.25);
    updateVizZoom();
  });

  btnVizZoomReset.addEventListener('click', () => {
    currentVizZoom = 1;
    updateVizZoom();
  });

  initVizProfiles(updateVisualizer);

  // Initial draw
  updateVisualizer();
  
  // Fit to screen on initial load
  const initialRes = selectVizRes.value;
  if (initialRes) {
    const [w, h] = initialRes.split(',').map(Number);
    fitZoomToScreen(w, h);
  } else {
    updateVizZoom();
  }
}

function initVizProfiles(updateCb) {
  const STORAGE_KEY = 'cgTools_viz_presets';
  const loadProfiles = () => JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  const saveProfiles = (p) => localStorage.setItem(STORAGE_KEY, JSON.stringify(p));

  const refreshDropdown = () => {
    const profiles = loadProfiles();
    // Keep the first option (default)
    selectVizPreset.innerHTML = '<option value="default">Default</option>';
    
    Object.keys(profiles).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      selectVizPreset.appendChild(opt);
    });
  };

  refreshDropdown();

  btnSaveViz.addEventListener('click', () => {
    const name = prompt('Enter a name for this visualizer profile:');
    if (!name || name === 'default') return;

    const profiles = loadProfiles();
    profiles[name] = {
      res: selectVizRes.value,
      charW: valCharWidth.value,
      charH: valCharHeight.value,
      tileSize: valTileSize.value
    };
    saveProfiles(profiles);
    
    refreshDropdown();
    selectVizPreset.value = name;
    showToast(`Saved Visualizer Profile: ${name}`, 'success');
  });

  btnDeleteViz.addEventListener('click', () => {
    const name = selectVizPreset.value;
    if (name === 'default') {
      showToast('Cannot delete default profile.', 'error');
      return;
    }
    if (!confirm(`Delete visualizer profile "${name}"?`)) return;

    const profiles = loadProfiles();
    delete profiles[name];
    saveProfiles(profiles);
    
    refreshDropdown();
    selectVizPreset.value = 'default';
    
    // reset to defaults
    selectVizRes.value = '320,180';
    valCharWidth.value = 30;
    valCharHeight.value = 50;
    valTileSize.value = 16;
    updateCb();
    
    showToast('Profile deleted', 'success');
  });

  selectVizPreset.addEventListener('change', () => {
    const name = selectVizPreset.value;
    if (name === 'default') {
      selectVizRes.value = '320,180';
      valCharWidth.value = 30;
      valCharHeight.value = 50;
      valTileSize.value = 16;
    } else {
      const profiles = loadProfiles();
      const p = profiles[name];
      if (p) {
        selectVizRes.value = p.res;
        valCharWidth.value = p.charW;
        valCharHeight.value = p.charH;
        valTileSize.value = p.tileSize;
      }
    }
    updateCb();
    showToast(`Loaded: ${name}`, 'success');
  });
}

// Check for updates every 60s
const CURRENT_VERSION = 'v0.25';
function checkForUpdates() {
  fetch('./index.html?t=' + Date.now())
    .then(r => r.text())
    .then(html => {
      const match = html.match(/<span class="app-version">(v\d+\.\d+)<\/span>/);
      if (match && match[1] && match[1] !== CURRENT_VERSION) {
        showToast('', 'update', `<span>New version detected (${match[1]}).</span> <button onclick="location.reload(true)" style="margin-left:10px;padding:4px 8px;background:var(--accent-lime);color:var(--bg-dark);border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Refresh</button>`);
      }
    })
    .catch(e => console.log('Update check failed', e));
}
setInterval(checkForUpdates, 60000);
setTimeout(checkForUpdates, 5000);
/* ==========================================================================
   Checkerboard Tool
   ========================================================================== */
function initCheckerboard() {
  const selectPreset = document.getElementById('select-check-preset');
  const btnSavePreset = document.getElementById('btn-save-check');
  const btnDeletePreset = document.getElementById('btn-delete-check');
  const btnReset = document.getElementById('btn-reset-check');
  
  const valWidth = document.getElementById('val-check-width');
  const rangeWidth = document.getElementById('range-check-width');
  const valHeight = document.getElementById('val-check-height');
  const rangeHeight = document.getElementById('range-check-height');
  
  const valColor1 = document.getElementById('val-check-color1');
  const valColor2 = document.getElementById('val-check-color2');
  
  const valSquare = document.getElementById('val-check-square');
  const rangeSquare = document.getElementById('range-check-square');
  
  const canvas = document.getElementById('check-canvas');
  const ctx = canvas.getContext('2d');
  
  const btnCopy = document.getElementById('btn-check-copy');
  const btnSave = document.getElementById('btn-check-save');
  
  const canvasContainer = document.getElementById('check-canvas-container');
  const btnZoomIn = document.getElementById('btn-check-zoom-in');
  const btnZoomOut = document.getElementById('btn-check-zoom-out');
  const btnZoomReset = document.getElementById('btn-check-zoom-reset');
  
  let currentZoom = 1;

  const updateZoom = () => {
    canvasContainer.style.transform = `scale(${currentZoom})`;
    btnZoomReset.textContent = `${Math.round(currentZoom * 100)}%`;
  };
  
  const fitZoomToScreen = (w, h) => {
    const scaleX = 800 / w;
    const scaleY = 500 / h;
    let targetZoom = Math.min(scaleX, scaleY);
    targetZoom = Math.max(0.25, Math.floor(targetZoom * 4) / 4);
    currentZoom = targetZoom;
    updateZoom();
  };

  btnZoomIn.addEventListener('click', () => { currentZoom += 0.25; updateZoom(); });
  btnZoomOut.addEventListener('click', () => { currentZoom = Math.max(0.10, currentZoom - 0.25); updateZoom(); });
  btnZoomReset.addEventListener('click', () => { currentZoom = 1; updateZoom(); });

  const setupSlider = (rangeEl, valEl) => {
    rangeEl.addEventListener('input', () => {
      valEl.value = rangeEl.value;
      drawCheckerboard();
    });
    valEl.addEventListener('input', () => {
      let val = parseInt(valEl.value);
      if (isNaN(val)) return;
      const min = parseInt(rangeEl.min) || 1;
      const max = parseInt(rangeEl.max) || parseInt(rangeEl.max); // fallback
      if (val < min) val = min;
      if (val > max) val = max;
      rangeEl.value = val;
      drawCheckerboard();
    });
    valEl.addEventListener('blur', () => { valEl.value = rangeEl.value; });
  };

  setupSlider(rangeWidth, valWidth);
  setupSlider(rangeHeight, valHeight);
  setupSlider(rangeSquare, valSquare);
  
  const setupSpinControls = (inputEl, rangeEl) => {
    const container = inputEl.closest('.input-with-suffix');
    if (container && !container.querySelector('.spin-controls')) {
      const spinControls = document.createElement('div');
      spinControls.className = 'spin-controls';
      spinControls.innerHTML = `
        <button class="spin-up">▲</button>
        <button class="spin-down">▼</button>
      `;
      container.appendChild(spinControls);

      const btnUp = spinControls.querySelector('.spin-up');
      const btnDown = spinControls.querySelector('.spin-down');

      const stepVal = (dir) => {
        let val = parseInt(inputEl.value) || 0;
        val += dir;
        const min = parseInt(inputEl.min) || 1;
        const max = parseInt(inputEl.max) || parseInt(rangeEl.max);
        if (val < min) val = min;
        if (val > max) val = max;
        
        inputEl.value = val;
        rangeEl.value = val;
        drawCheckerboard();
      };

      btnUp.addEventListener('click', () => stepVal(1));
      btnDown.addEventListener('click', () => stepVal(-1));
    }
  };

  setupSpinControls(valWidth, rangeWidth);
  setupSpinControls(valHeight, rangeHeight);
  setupSpinControls(valSquare, rangeSquare);

  valColor1.addEventListener('input', drawCheckerboard);
  valColor2.addEventListener('input', drawCheckerboard);

  function drawCheckerboard() {
    const w = parseInt(valWidth.value) || 1920;
    const h = parseInt(valHeight.value) || 1080;
    const size = parseInt(valSquare.value) || 60;
    const c1 = valColor1.value;
    const c2 = valColor2.value;
    
    canvas.width = w;
    canvas.height = h;
    
    canvasContainer.style.width = `${w}px`;
    canvasContainer.style.height = `${h}px`;
    
    // Efficient fill
    ctx.fillStyle = c2;
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = c1;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  // Presets
  const STORAGE_KEY = 'cgTools_check_presets';
  const loadProfiles = () => JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  const saveProfiles = (p) => localStorage.setItem(STORAGE_KEY, JSON.stringify(p));

  const refreshDropdown = () => {
    const profiles = loadProfiles();
    selectPreset.innerHTML = '<option value="default">Default</option>';
    Object.keys(profiles).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      selectPreset.appendChild(opt);
    });
  };

  refreshDropdown();

  btnSavePreset.addEventListener('click', () => {
    const name = prompt('Enter a name for this Checkerboard preset:');
    if (!name) return;
    const profiles = loadProfiles();
    profiles[name] = {
      w: valWidth.value,
      h: valHeight.value,
      c1: valColor1.value,
      c2: valColor2.value,
      sq: valSquare.value
    };
    saveProfiles(profiles);
    refreshDropdown();
    selectPreset.value = name;
    showToast('Profile saved!', 'success');
  });

  btnDeletePreset.addEventListener('click', () => {
    const name = selectPreset.value;
    if (name === 'default') { showToast('Cannot delete default.', 'error'); return; }
    if (!confirm(`Delete profile "${name}"?`)) return;
    const profiles = loadProfiles();
    delete profiles[name];
    saveProfiles(profiles);
    refreshDropdown();
    btnReset.click();
    showToast('Profile deleted', 'success');
  });

  selectPreset.addEventListener('change', () => {
    const name = selectPreset.value;
    if (name === 'default') {
      btnReset.click();
    } else {
      const p = loadProfiles()[name];
      if (p) {
        valWidth.value = p.w; rangeWidth.value = p.w;
        valHeight.value = p.h; rangeHeight.value = p.h;
        valColor1.value = p.c1;
        valColor2.value = p.c2;
        valSquare.value = p.sq; rangeSquare.value = p.sq;
        drawCheckerboard();
      }
    }
  });

  btnReset.addEventListener('click', () => {
    valWidth.value = 1920; rangeWidth.value = 1920;
    valHeight.value = 1080; rangeHeight.value = 1080;
    valColor1.value = '#d1d5db';
    valColor2.value = '#9ca3af';
    valSquare.value = 60; rangeSquare.value = 60;
    selectPreset.value = 'default';
    drawCheckerboard();
  });

  // Export
  btnSave.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `checkerboard_${valWidth.value}x${valHeight.value}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Image saved', 'success');
  });

  btnCopy.addEventListener('click', () => {
    canvas.toBlob(blob => {
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          showToast('Copied to clipboard!', 'success');
        }).catch(err => {
          showToast('Clipboard copy failed.', 'error');
        });
      } catch (err) {
        showToast('Clipboard API error.', 'error');
      }
    });
  });

  // Initial
  drawCheckerboard();
  fitZoomToScreen(1920, 1080);
}

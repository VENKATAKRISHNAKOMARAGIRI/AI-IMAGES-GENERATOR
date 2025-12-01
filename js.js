~~~{"id":"59211","variant":"standard","title":"Fixed JS with updated HuggingFace Router API"}
//
// ---------------- Config ----------------
const promptForm = document.querySelector(".prompt-form");
const themeToggle = document.querySelector(".theme-toggle");
const promptBtn = document.querySelector(".prompt-btn");
const promptInput = document.querySelector(".prompt-input");
const generateBtn = document.querySelector(".generate-btn");
const galleryGrid = document.querySelector(".gallery-grid");
const modelSelect = document.getElementById("model-select");
const countSelect = document.getElementById("count-select");
const ratioSelect = document.getElementById("ratio-select");

// ⭐ Your Hugging Face API key
const API_KEY = "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";

const examplePrompts = [
  "A magic forest with glowing plants and fairy homes among giant mushrooms",
  "A cyberpunk city with neon lights and flying cars",
  "A dragon sleeping in a crystal cave",
  "A floating island above the clouds with waterfalls",
  "A futuristic Mars colony with glowing domes",
];

//
// ---------------- Theme Handling ----------------
(() => {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);

  document.body.classList.toggle("dark-theme", isDark);
  themeToggle.querySelector("i").className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
})();

const toggleTheme = () => {
  const dark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", dark ? "dark" : "light");
  themeToggle.querySelector("i").className = dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
};

//
// ---------------- Helpers ----------------
const normalizeRatio = (ratio) => ratio.replace(":", "/").trim();

const getImageDimensions = (ratio, base = 512) => {
  const parts = normalizeRatio(ratio).split("/").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return { width: 512, height: 512 };

  const [w, h] = parts;
  const scale = base / Math.sqrt(w * h);

  return {
    width: Math.max(64, Math.floor((w * scale) / 16) * 16),
    height: Math.max(64, Math.floor((h * scale) / 16) * 16),
  };
};

const updateImageCard = (index, imageUrl) => {
  const card = document.getElementById(`img-card-${index}`);
  if (!card) return;

  card.classList.remove("loading");
  card.innerHTML = `
    <img class="result-img" src="${imageUrl}" alt="Generated image ${index}">
    <div class="img-overlay">
      <a href="${imageUrl}" class="img-download-btn" download>
        <i class="fa-solid fa-download"></i>
      </a>
    </div>
  `;
};

const setCardError = (index, msg) => {
  const card = document.getElementById(`img-card-${index}`);
  if (!card) return;
  card.classList.remove("loading");
  card.classList.add("error");
  const text = card.querySelector(".status-text");
  if (text) text.textContent = msg;
};

//
// ---------------- API Request (FIXED) ----------------
const generateImages = async (model, count, ratio, promptText) => {
  if (!API_KEY) {
    alert("Missing API key.");
    return;
  }

  // ⭐ Updated HuggingFace Router (REQUIRED)
  const MODEL_URL = `https://router.huggingface.co/hf-inference/models/${model}`;

  const { width, height } = getImageDimensions(ratio);
  generateBtn.disabled = true;

  const tasks = Array.from({ length: count }, async (_, i) => {
    try {
      const body = {
        inputs: promptText,   // ⭐ HF router requires "inputs"
        parameters: {
          width,
          height,
        }
      };

      const response = await fetch(MODEL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const contentType = response.headers.get("content-type") || "";

      // ⭐ If router returns direct image
      if (contentType.startsWith("image/")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        updateImageCard(i, url);
        return;
      }

      // ⭐ If router returns JSON Base64
      const data = await response.json();
      const img =
        data?.generated_image ??
        data?.images?.[0] ??
        (Array.isArray(data) ? data[0]?.generated_image : null);

      if (!img) throw new Error("Unexpected response format");

      const finalURL =
        img.startsWith("data:") ? img : `data:image/png;base64,${img}`;

      updateImageCard(i, finalURL);
    } catch (err) {
      console.error(err);
      setCardError(i, "Generation failed");
    }
  });

  await Promise.allSettled(tasks);
  generateBtn.disabled = false;
};

//
// ---------------- UI ----------------
const createImageCards = (model, count, ratio, promptText) => {
  galleryGrid.innerHTML = "";
  const cssRatio = normalizeRatio(ratio);

  for (let i = 0; i < count; i++) {
    galleryGrid.innerHTML += `
      <div class="img-card loading" id="img-card-${i}" style="aspect-ratio:${cssRatio}">
        <div class="status-container">
          <div class="spinner"></div>
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p class="status-text">Generating...</p>
        </div>
      </div>
    `;
  }

  document.querySelectorAll(".img-card").forEach((c, i) =>
    setTimeout(() => c.classList.add("animate-in"), 100 * i)
  );

  generateImages(model, count, ratio, promptText);
};

//
// ---------------- Form Handler ----------------
const handleFormSubmit = (e) => {
  e.preventDefault();

  const model = modelSelect.value;      // FLUX.1-dev or others
  const count = parseInt(countSelect.value, 10) || 1;
  const ratio = ratioSelect.value;
  const promptText = promptInput.value.trim();

  if (!promptText) {
    alert("Enter a prompt.");
    return;
  }

  createImageCards(model, count, ratio, promptText);
};

//
// ---------------- Events ----------------
themeToggle.addEventListener("click", toggleTheme);
promptForm.addEventListener("submit", handleFormSubmit);

promptBtn.addEventListener("click", () => {
  const prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
  promptInput.value = "";
  let i = 0;

  const type = setInterval(() => {
    if (i < prompt.length) {
      promptInput.value += prompt[i++];
    } else {
      clearInterval(type);
    }
  }, 10);
});

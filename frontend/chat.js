const API_BASE = "http://127.0.0.1:8000";

// Configure PDFJS Worker path
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

let sessionId = localStorage.getItem("session_id") || null;

const apiKeyInput = document.getElementById("apiKey");
const dropZone = document.getElementById("dropZone");
const pdfFiles = document.getElementById("pdfFiles");
const fileList = document.getElementById("fileList");
const uploadBtn = document.getElementById("uploadBtn");
const statusCard = document.getElementById("statusCard");
const setupCard = document.getElementById("setupCard");
const toggleSetupBtn = document.getElementById("toggleSetupBtn");

const workspaceContainer = document.getElementById("workspaceContainer");
const chatSection = document.getElementById("chatSection");
const chatMessages = document.getElementById("chatMessages");

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const contextBar = document.getElementById("contextBar");

const newSessionBtn = document.getElementById("newSessionBtn");
const downloadChatBtn = document.getElementById("downloadChatBtn");

// New split panels components elements mapping nodes hooks
const pdfPanel = document.getElementById("pdfPanel");
const panelResizer = document.getElementById("panelResizer");
const pdfSelector = document.getElementById("pdfSelector");
const togglePdfBtn = document.getElementById("togglePdfBtn");
const pdfViewer = document.getElementById("pdfViewer");
const quoteSelectionBtn = document.getElementById("quoteSelectionBtn");

const modal = document.getElementById("chunkModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

if (closeModal && modal) {
  closeModal.onclick = () => {
    modal.classList.add("hidden");
  };
}

window.onclick = (e) => {
  if (!modal) return;
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
};

let selectedFiles = [];
let chatHistory = [];
let activeResizing = false;
let currentSelectedText = "";
let attachedContext = "";

/* =========================
SESSION RESTORE
========================= */

async function restoreSessionPdf(sessionId) {
  const res = await fetch(`${API_BASE}/session/${sessionId}`);
  const data = await res.json();

  pdfSelector.innerHTML =
    '<option value="" disabled selected>Select an indexed document...</option>';

  selectedFiles = []; // reset

  for (const fileName of data.pdfs) {
    // add to dropdown
    const opt = document.createElement("option");
    opt.value = fileName;
    opt.textContent = fileName;
    pdfSelector.appendChild(opt);

    // fetch actual PDF bytes
    const pdfRes = await fetch(
      `${API_BASE}/session/${sessionId}/pdf/${fileName}`
    );

    const blob = await pdfRes.blob();
    const file = new File([blob], fileName, { type: "application/pdf" });

    selectedFiles.push(file);
  }
}

async function checkActiveSession() {
  if (!sessionId) return;

  try {
    const res = await fetch(`${API_BASE}/session/${sessionId}`);

    if (!res.ok) {
      localStorage.removeItem("session_id");
      sessionId = null;
      clearSessionState();
      return;
    }

    restoreSessionPdf(sessionId);

    statusCard.classList.remove("hidden");
    workspaceContainer.classList.remove("hidden");
    newSessionBtn.classList.remove("hidden");
    downloadChatBtn.classList.remove("hidden");

    statusCard.innerHTML = `<i class="fa-solid fa-circle-check"></i> Connected to active session`;

    chatMessages.innerHTML = "";
    addMessage("Welcome back! Your session is active.", "assistant");
  } catch (err) {
    console.log("Session restore failed:", err);
    clearSessionState();
  }
}

checkActiveSession();

function clearSessionState() {
  sessionId = null;
  localStorage.removeItem("session_id");

  selectedFiles = [];
  chatHistory = [];

  chatMessages.innerHTML = "";
  fileList.innerHTML = "";
  pdfSelector.innerHTML =
    '<option value="" disabled selected>Select an indexed document...</option>';
  pdfViewer.innerHTML =
    '<div class="pdf-placeholder">Select an indexed document to view its content</div>';

  statusCard.classList.add("hidden");
  workspaceContainer.classList.add("hidden");
  newSessionBtn.classList.add("hidden");
  downloadChatBtn.classList.add("hidden");

  pdfFiles.value = "";
  statusCard.textContent = "Ready";
}

if (toggleSetupBtn && setupCard) {
  toggleSetupBtn.addEventListener("click", () => {
    const isMinimized = setupCard.classList.toggle("minimized");

    // Update button contents dynamically based on status state window tracking
    if (isMinimized) {
      toggleSetupBtn.innerHTML = `<i class="fa-solid fa-chevron-down"></i> Show Configuration`;
    } else {
      toggleSetupBtn.innerHTML = `<i class="fa-solid fa-chevron-up"></i> Hide Configuration`;
    }
  });
}

/* =========================
SPLIT PANE RESIZER & COLLAPSIBLE SYSTEM
========================= */
panelResizer.addEventListener("mousedown", (e) => {
  activeResizing = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!activeResizing) return;

  const containerRect = workspaceContainer.getBoundingClientRect();
  const requestedViewerWidth = containerRect.right - e.clientX;

  // Rule Check: Left view can only increase width up to its safety boundaries rule constraints
  const prospectiveChatWidth = e.clientX - containerRect.left;

  if (prospectiveChatWidth >= 450 && requestedViewerWidth >= 0) {
    pdfPanel.style.width = `${requestedViewerWidth}px`;
    if (requestedViewerWidth > 10) {
      pdfPanel.classList.remove("collapsed");
    }
  }
});

document.addEventListener("mouseup", () => {
  if (activeResizing) {
    activeResizing = false;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }
});

// Structural collapsibility handler toggle hook engine
togglePdfBtn.addEventListener("click", () => {
  pdfPanel.classList.toggle("collapsed");
});

/* =========================
DRAG & DROP
========================= */
dropZone.addEventListener("click", () => {
  pdfFiles.click();
});

pdfFiles.addEventListener("change", (e) => {
  addUniqueFiles(e.target.files);
  renderFileList();
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const files = [...e.dataTransfer.files].filter((f) =>
    f.name.toLowerCase().endsWith(".pdf"),
  );

  addUniqueFiles(files);
  renderFileList();
});

function addUniqueFiles(files) {
  for (let f of files) {
    const exists = selectedFiles.some(
      (x) => x.name === f.name && x.size === f.size,
    );
    if (!exists) selectedFiles.push(f);
  }
}

/* =========================
FILE LIST & SELECTOR
========================= */
function renderFileList() {
  fileList.innerHTML = "";

  selectedFiles.forEach((file) => {
    const div = document.createElement("div");
    div.className = "file-item";

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-file-pdf";

    const name = document.createElement("span");
    name.textContent = file.name;

    const remove = document.createElement("i");
    remove.className = "fa-solid fa-trash remove-file-btn";

    remove.onclick = (e) => {
      e.stopPropagation();
      selectedFiles = selectedFiles.filter((f) => f !== file);
      renderFileList();
    };

    div.appendChild(icon);
    div.appendChild(name);
    div.appendChild(remove);

    fileList.appendChild(div);
  });
}

function renderContextBar() {
  if (!attachedContext) {
    contextBar.classList.add("hidden");
    contextBar.innerHTML = "";
    return;
  }

  contextBar.classList.remove("hidden");

  contextBar.innerHTML = `
    <span class="source-chip user-context-chip">
      <i class="fa-solid fa-quote-right"></i>
      ${attachedContext.slice(0, 150)}
      ${attachedContext.length > 150 ? "..." : ""}
      <button id="removeContextBtn" style="color: white;">×</button>
    </span>
  `;

  document.getElementById("removeContextBtn").onclick = () => {
    attachedContext = "";
    renderContextBar();
  };
}

function updatePdfSelector() {
  pdfSelector.innerHTML =
    '<option value="" disabled selected>Select an indexed document...</option>';
  selectedFiles.forEach((file, idx) => {
    const opt = document.createElement("option");
    opt.value = file.name;
    opt.textContent = file.name;
    pdfSelector.appendChild(opt);
  });
}

/* =========================
PDF RENDERING CORE ENGINE (PDF.js Text Layer Integration)
========================= */
pdfSelector.addEventListener("change", async (e) => {
  const fileName = e.target.value;

  const file = selectedFiles.find((f) => f.name === fileName);
  if (!file) return;

  pdfViewer.innerHTML =
    '<div class="pdf-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> Rendering Text Layers...</div>';

  try {
    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;

      pdfViewer.innerHTML = ""; // Flush the placeholder cleanly

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Setup wrapper configuration system elements container
        const viewport = page.getViewport({ scale: 1.5 });

        const pageContainer = document.createElement("div");
        pageContainer.className = "pdf-page-container";

        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        pageContainer.style.position = "relative";

        // Canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        // Text layer
        const textLayerDiv = document.createElement("div");
        textLayerDiv.className = "pdf-text-layer";

        pageContainer.appendChild(canvas);
        pageContainer.appendChild(textLayerDiv);

        pdfViewer.appendChild(pageContainer);

        // Render page
        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        // Render selectable text layer
        const textContent = await page.getTextContent();

        await pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
          textDivs: [],
        });
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error("Failed to render PDF text layer:", err);
    pdfViewer.innerHTML =
      '<div class="pdf-placeholder" style="color:#ef4444;">Error opening view context layers.</div>';
  }
});

/* =========================
HIGHLIGHT TEXT SELECTION SEED ENGINE (ChatGPT-style Action)
========================= */
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // Guardrail layout boundaries checking context to confirm selection was pulled from the PDF view panel container bounds safely
  if (selectedText && pdfViewer.contains(selection.anchorNode)) {
    currentSelectedText = selectedText;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    quoteSelectionBtn.style.left = `${rect.left + rect.width / 2}px`;
    quoteSelectionBtn.style.top = `${rect.top}px`;
    quoteSelectionBtn.classList.remove("hidden");
  } else {
    // Hide button asynchronously if mouse leaves bounds or selection resets
    setTimeout(() => {
      if (!window.getSelection().toString().trim()) {
        quoteSelectionBtn.classList.add("hidden");
      }
    }, 100);
  }
});

quoteSelectionBtn.addEventListener("mousedown", (e) => {
  e.preventDefault(); // Prevents selection click loss sequence mapping loops
  if (!currentSelectedText) return;

  // const quoteString = `"${currentSelectedText}"\n`;
  attachedContext = currentSelectedText;
  renderContextBar();
  // userInput.value = userInput.value
  //   ? `${userInput.value} ${quoteString}`
  //   : quoteString;
  userInput.focus();

  // Reset selection states context values
  window.getSelection().removeAllRanges();
  quoteSelectionBtn.classList.add("hidden");
});

/* =========================
UPLOAD
========================= */
uploadBtn.addEventListener("click", uploadDocuments);

newSessionBtn.addEventListener("click", async () => {
  if (sessionId) {
    try {
      await fetch(`${API_BASE}/session/${sessionId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.log(e);
    }
  }

  clearSessionState();
  addMessage("New session started.", "assistant");
});

async function uploadDocuments() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) return alert("Enter API key");
  if (!selectedFiles.length) return alert("Select PDFs");

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Indexing...";

  statusCard.classList.remove("hidden");
  statusCard.textContent = "Building vector index...";

  const formData = new FormData();
  formData.append("api_key", apiKey);
  selectedFiles.forEach((f) => formData.append("files", f));

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");

    sessionId = data.session_id;
    localStorage.setItem("session_id", sessionId);

    newSessionBtn.classList.remove("hidden");
    downloadChatBtn.classList.remove("hidden");

    statusCard.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${data.documents} PDFs • ${data.chunks} chunks`;

    // Automatically roll up the panel once files finish indexing
    setupCard.classList.add("minimized");
    toggleSetupBtn.innerHTML = `<i class="fa-solid fa-chevron-down"></i> Show Configuration`;
    workspaceContainer.classList.remove("hidden");
    chatMessages.innerHTML = "";

    updatePdfSelector();
    addMessage("Documents indexed. Ask anything!", "assistant");
  } catch (err) {
    statusCard.textContent = "Indexing failed";
    alert(err.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Index Documents";
  }
}

/* =========================
CHAT EXPORT
========================= */
downloadChatBtn.addEventListener("click", downloadChat);

function downloadChat() {
  if (!chatHistory.length) return alert("No chat");

  let out = "# Chat Export\n\n";

  chatHistory.forEach((m) => {
    if (m.selectedContext) {
      out += `### SELECTED CONTEXT:\n${m.selectedContext}\n\n`;
    }
    out += `## ${m.role.toUpperCase()}\n${m.text}\n\n`;


    if (m.sources?.length) {
      out += "Sources:\n";
      m.sources.forEach((s) => {
        out += `- ${s.file} (p${s.page})\n`;
      });
      out += "\n";
    }

    out += "---\n\n";
  });

  const blob = new Blob([out], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const safeId = sessionId ? sessionId.slice(0, 8) : "session";

  a.href = url;
  a.download = `chat-${safeId}.md`;
  a.click();

  URL.revokeObjectURL(url);
}

/* =========================
CHAT
========================= */
sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.repeat) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  if (sendBtn.disabled) return;

  const apiKey = apiKeyInput.value.trim();
  const message = userInput.value.trim();

  if (!apiKey) return alert("Enter API key");
  if (!sessionId) return alert("Upload files");
  if (!message) return;

  sendBtn.disabled = true;
  userInput.disabled = true;

  const empty = chatMessages.querySelector(".empty-state");
  if (empty) empty.remove();

  const contextToSend = attachedContext;

  addMessage(message, "user", [], contextToSend);
  attachedContext = "";
  renderContextBar();
  userInput.value = "";

  const loading = addMessage("Thinking...", "assistant");
  loading.dataset.loading = "true";

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        selected_context: contextToSend,
      }),
    });

    const data = await res.json();

    if (loading?.isConnected) loading.remove();

    if (!res.ok) throw new Error(data.detail || "Chat failed");

    addMessage(data.answer, "assistant", data.sources);
  } catch (err) {
    if (loading?.isConnected) loading.remove();
    addMessage(`Error: ${err.message}`, "assistant");
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

/* =========================
MESSAGE RENDER
========================= */
function addMessage(text, role, sources = [], selectedContext = null) {
  const div = document.createElement("div");
  div.classList.add("message", role);

  const content = document.createElement("div");
  content.classList.add("message-content");

  try {
    content.innerHTML =
      typeof marked !== "undefined" ? marked.parse(text || "") : text || "";
  } catch {
    content.textContent = text || "";
  }

  const actions = document.createElement("div");
  actions.classList.add("message-actions");

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  const icon = document.createElement("i");
  icon.className = "fa-regular fa-copy";

  copyBtn.appendChild(icon);

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      icon.className = "fa-solid fa-check";
      setTimeout(() => (icon.className = "fa-regular fa-copy"), 1200);
    } catch (e) {
      console.log(e);
    }
  };

  actions.appendChild(copyBtn);
  if (role === "user" && selectedContext) {
    const chip = document.createElement("div");

    chip.className = "quoted-context";

    chip.innerHTML = `
    <i class="fa-solid fa-quote-right"></i>
    ${selectedContext.slice(0, 150)}
    ${selectedContext.length > 150 ? "..." : ""}
  `;

    div.appendChild(chip);
  }
  div.appendChild(content);
  div.appendChild(actions);

  if (sources?.length) {
    const wrap = document.createElement("div");
    wrap.className = "sources";

    sources.forEach((s) => {
      const chip = document.createElement("span");
      chip.className = "source-chip";

      chip.innerHTML = `<i class="fa-solid fa-quote-left"></i> ${s.file} · p${s.page}`;

      chip.onclick = () => {
        modalTitle.textContent = `${s.file} — Page ${s.page}`;
        modalBody.textContent = s.content || "No content";
        modal.classList.remove("hidden");
      };

      wrap.appendChild(chip);
    });

    div.appendChild(wrap);
  }

  if (text && text !== "Thinking...") {
    chatHistory.push({ role, text, sources, selectedContext });
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return div;
}

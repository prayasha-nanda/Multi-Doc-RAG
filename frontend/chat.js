const API_BASE = "http://127.0.0.1:8000";

let sessionId = localStorage.getItem("session_id") || null;

const apiKeyInput = document.getElementById("apiKey");
const dropZone = document.getElementById("dropZone");
const pdfFiles = document.getElementById("pdfFiles");
const fileList = document.getElementById("fileList");
const uploadBtn = document.getElementById("uploadBtn");
const statusCard = document.getElementById("statusCard");

const chatSection = document.getElementById("chatSection");
const chatMessages = document.getElementById("chatMessages");

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const newSessionBtn = document.getElementById("newSessionBtn");
const downloadChatBtn = document.getElementById("downloadChatBtn");

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

/* =========================
SESSION RESTORE
========================= */
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

    statusCard.classList.remove("hidden");
    chatSection.classList.remove("hidden");
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

  statusCard.classList.add("hidden");
  chatSection.classList.add("hidden");
  newSessionBtn.classList.add("hidden");
  downloadChatBtn.classList.add("hidden");

  pdfFiles.value = "";
  statusCard.textContent = "Ready";
}

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
FILE LIST
========================= */
function renderFileList() {
  fileList.innerHTML = "";

  selectedFiles.forEach((file, index) => {
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

    chatSection.classList.remove("hidden");
    chatMessages.innerHTML = "";

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

  const empty = chatMessages.querySelector(".empty-state");
  if (empty) empty.remove();

  addMessage(message, "user");
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
  }
}

/* =========================
MESSAGE RENDER
========================= */
function addMessage(text, role, sources = []) {
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
    chatHistory.push({ role, text, sources });
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return div;
}

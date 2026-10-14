const API = "/api/todos";

const form = document.getElementById("todo-form");
const titleInput = document.getElementById("title-input");
const descriptionInput = document.getElementById("description-input");
const list = document.getElementById("todo-list");
const empty = document.getElementById("empty");
const errorEl = document.getElementById("error");
const countEl = document.getElementById("count");
const filterButtons = document.querySelectorAll(".filter");

let todos = [];
let currentFilter = "all";

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  setTimeout(() => (errorEl.hidden = true), 4000);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function render() {
  const visible = todos.filter((t) => {
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    return true;
  });

  list.innerHTML = visible
    .map(
      (t) => `
      <li class="todo-item ${t.completed ? "completed" : ""}" data-id="${t.id}">
        <input type="checkbox" class="toggle" ${t.completed ? "checked" : ""} aria-label="Toggle todo" />
        <div class="content">
          <span class="title">${escapeHtml(t.title)}</span>
          ${t.description ? `<span class="description">${escapeHtml(t.description)}</span>` : ""}
        </div>
        <button class="delete" aria-label="Delete todo">&times;</button>
      </li>`
    )
    .join("");

  empty.hidden = visible.length > 0;

  const remaining = todos.filter((t) => !t.completed).length;
  countEl.textContent = `${remaining} item${remaining === 1 ? "" : "s"} left`;
}

async function loadTodos() {
  try {
    todos = await request(API);
    render();
  } catch (err) {
    showError(`Failed to load todos: ${err.message}`);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  try {
    const created = await request(API, {
      method: "POST",
      body: JSON.stringify({
        title,
        description: descriptionInput.value.trim(),
      }),
    });
    todos.unshift(created);
    titleInput.value = "";
    descriptionInput.value = "";
    titleInput.focus();
    render();
  } catch (err) {
    showError(`Failed to add todo: ${err.message}`);
  }
});

list.addEventListener("click", async (e) => {
  const item = e.target.closest(".todo-item");
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.classList.contains("toggle")) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    try {
      const updated = await request(`${API}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ completed: e.target.checked }),
      });
      Object.assign(todo, updated);
      render();
    } catch (err) {
      showError(`Failed to update todo: ${err.message}`);
      render();
    }
  }

  if (e.target.classList.contains("delete")) {
    try {
      await request(`${API}/${id}`, { method: "DELETE" });
      todos = todos.filter((t) => t.id !== id);
      render();
    } catch (err) {
      showError(`Failed to delete todo: ${err.message}`);
    }
  }
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

loadTodos();

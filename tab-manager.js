const DEFAULT_TABS = [
  { id: "tab-1", name: "Tab 1", color: "#d8e7d2", href: "index.html" },
  { id: "tab-2", name: "Tab 2", color: "#d8e7d2", href: "asset.html" },
];

const STORAGE_KEY = "accounting-fo-folder-tabs";
const DEFAULT_COLOR = "#d8e7d2";
const CANVAS_ITEM_TYPES = new Set(["text", "note", "list", "image"]);

const normalizePath = (path) => path.split("/").pop() || "index.html";
const createTabHref = (id) => `index.html?tab=${encodeURIComponent(id)}`;

const normalizePageKey = (href) => {
  try {
    const url = new URL(href, window.location.href);
    return `${normalizePath(url.pathname)}${url.search}`;
  } catch (error) {
    return normalizePath(href);
  }
};

const loadTabs = () => {
  try {
    const savedTabs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(savedTabs) && savedTabs.length > 0) {
      return savedTabs.map((tab, index) => {
        const id = tab.id || `tab-${index + 1}`;

        return {
          id,
          name: tab.name || `Tab ${index + 1}`,
          color: tab.color || DEFAULT_COLOR,
          href: tab.href && tab.href !== "#" ? tab.href : createTabHref(id),
        };
      });
    }
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }

  return DEFAULT_TABS;
};

const saveTabs = (tabs) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
const isCurrentTab = (tab, index, currentPage = getCurrentPageKey()) =>
  normalizePageKey(tab.href) === currentPage || (currentPage === "index.html" && index === 0);

const promptForName = (tab) => {
  const nextName = prompt("Rename tab", tab.name)?.trim();
  return nextName || tab.name;
};

const closeTabMenu = () => document.querySelector(".tab-menu")?.remove();

const positionTabMenu = (menu, event) => {
  const viewportPadding = 8;
  const { width, height } = menu.getBoundingClientRect();
  const maxLeft = window.innerWidth - width - viewportPadding;
  const maxTop = window.innerHeight - height - viewportPadding;

  const left = Math.min(Math.max(event.clientX, viewportPadding), Math.max(maxLeft, viewportPadding));
  const top = Math.min(Math.max(event.clientY, viewportPadding), Math.max(maxTop, viewportPadding));

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
};

const openTabMenu = (event, tabs, index) => {
  closeTabMenu();

  const tab = tabs[index];
  const menu = document.createElement("div");
  menu.className = "tab-menu";
  menu.innerHTML = `
    <button class="tab-menu-item" type="button" data-tab-action="rename">Rename tab</button>
    <label class="tab-menu-color">
      <span>Tab color</span>
      <input type="color" value="${tab.color}" />
    </label>
    <button class="tab-menu-item tab-menu-delete" type="button" data-tab-action="delete" ${tabs.length === 1 ? "disabled" : ""}>
      Delete tab
    </button>
  `;

  menu.querySelector('[data-tab-action="rename"]').addEventListener("click", () => {
    tabs[index].name = promptForName(tab);
    saveTabs(tabs);
    renderTabs();
  });

  menu.querySelector('[data-tab-action="delete"]').addEventListener("click", () => {
    if (tabs.length === 1) return;

    const currentPage = getCurrentPageKey();
    const shouldNavigate = isCurrentTab(tab, index, currentPage);
    const remainingTabs = tabs.filter((_, tabIndex) => tabIndex !== index);
    const nextTab = remainingTabs[Math.min(index, remainingTabs.length - 1)];

    saveTabs(remainingTabs);

    if (shouldNavigate && nextTab) {
      window.location.href = nextTab.href;
      return;
    }

    renderTabs();
  });

  menu.querySelector("input").addEventListener("input", (colorEvent) => {
    tabs[index].color = colorEvent.target.value;
    saveTabs(tabs);
    renderTabs();
  });

  document.body.append(menu);
  positionTabMenu(menu, event);
};

const getCurrentPageKey = () => `${normalizePath(window.location.pathname)}${window.location.search}`;
const escapeHTML = (value) =>
  String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
const getCanvasStorageKey = () => `${STORAGE_KEY}-canvas-${getCurrentPageKey()}`;

const loadCanvasItems = () => {
  try {
    const savedItems = JSON.parse(localStorage.getItem(getCanvasStorageKey()));
    return Array.isArray(savedItems) ? savedItems.filter((item) => CANVAS_ITEM_TYPES.has(item.type)) : [];
  } catch (error) {
    localStorage.removeItem(getCanvasStorageKey());
    return [];
  }
};

const saveCanvasItems = (items) => localStorage.setItem(getCanvasStorageKey(), JSON.stringify(items));

const createCanvasItem = (type, overrides = {}) => ({
  id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type,
  content: overrides.content || "",
  src: overrides.src || "",
  x: overrides.x || 96,
  y: overrides.y || 96,
  width: overrides.width || 220,
  height: overrides.height || 150,
});

const updateCanvasItem = (items, id, updates) => {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return;

  items[index] = { ...items[index], ...updates };
  saveCanvasItems(items);
};

const promptForCanvasItem = (type, callback) => {
  if (type === "image") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
      const [file] = input.files;
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener("load", () => callback(createCanvasItem("image", { src: reader.result, height: 180 })));
      reader.readAsDataURL(file);
    });
    input.click();
    return;
  }

  const defaults = {
    text: "New text",
    note: "New sticky note",
    list: "First step\nSecond step\nThird step",
  };
  const labels = {
    text: "Text",
    note: "Sticky note",
    list: "List or process",
  };
  const content = prompt(`Add ${labels[type]}`, defaults[type])?.trim();
  if (!content) return;

  callback(createCanvasItem(type, { content, height: type === "text" ? 120 : 170 }));
};

const renderCanvasItemContent = (item) => {
  if (item.type === "image") {
    return `<img class="page-item-image" src="${escapeHTML(item.src)}" alt="User added image" />`;
  }

  if (item.type === "list") {
    const steps = item.content
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean)
      .map((step) => `<li>${escapeHTML(step)}</li>`)
      .join("");

    return `<ol class="page-item-list">${steps}</ol>`;
  }

  return `<div class="page-item-text"></div>`;
};

const makeCanvasItemDraggable = (element, handle, item, items) => {
  let startX = 0;
  let startY = 0;
  let itemX = 0;
  let itemY = 0;

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startX = event.clientX;
    startY = event.clientY;
    itemX = item.x;
    itemY = item.y;
    handle.setPointerCapture(event.pointerId);
    element.classList.add("is-dragging");
  });

  handle.addEventListener("pointermove", (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;

    const nextX = Math.max(0, itemX + event.clientX - startX);
    const nextY = Math.max(0, itemY + event.clientY - startY);
    item.x = nextX;
    item.y = nextY;
    element.style.left = `${nextX}px`;
    element.style.top = `${nextY}px`;
  });

  const finishDrag = (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;

    handle.releasePointerCapture(event.pointerId);
    element.classList.remove("is-dragging");
    updateCanvasItem(items, item.id, { x: item.x, y: item.y });
  };

  handle.addEventListener("pointerup", finishDrag);
  handle.addEventListener("pointercancel", finishDrag);
};

const renderCanvasItems = () => {
  const canvas = document.querySelector("[data-page-canvas]");
  if (!canvas) return;

  const items = loadCanvasItems();
  canvas.innerHTML = "";

  items.forEach((item) => {
    const element = document.createElement("article");
    element.className = `page-item page-item-${item.type}`;
    element.style.left = `${item.x}px`;
    element.style.top = `${item.y}px`;
    element.style.width = `${item.width}px`;
    element.style.height = `${item.height}px`;
    element.innerHTML = `
      <div class="page-item-handle" title="Drag item" aria-label="Drag item">${escapeHTML(item.type)}</div>
      <button class="page-item-delete" type="button" aria-label="Delete item">×</button>
      <div class="page-item-body">${renderCanvasItemContent(item)}</div>
    `;

    if (item.type === "text" || item.type === "note") {
      const text = element.querySelector(".page-item-text");
      text.textContent = item.content;
      text.contentEditable = "true";
      text.addEventListener("input", () => updateCanvasItem(items, item.id, { content: text.textContent }));
    }

    if (item.type === "list") {
      const list = element.querySelector(".page-item-list");
      list.contentEditable = "true";
      list.addEventListener("input", () => {
        const content = [...list.querySelectorAll("li")]
          .map((step) => step.textContent.trim())
          .filter(Boolean)
          .join("\n");
        updateCanvasItem(items, item.id, { content });
      });
    }

    element.querySelector(".page-item-delete").addEventListener("click", () => {
      saveCanvasItems(items.filter((savedItem) => savedItem.id !== item.id));
      renderCanvasItems();
    });

    new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      updateCanvasItem(items, item.id, { width, height });
    }).observe(element);

    makeCanvasItemDraggable(element, element.querySelector(".page-item-handle"), item, items);
    canvas.append(element);
  });
};

const renderCanvasToolbar = () => {
  if (document.querySelector("[data-page-toolbar]")) return;

  const toolbar = document.createElement("div");
  toolbar.className = "page-toolbar";
  toolbar.setAttribute("data-page-toolbar", "");
  toolbar.innerHTML = `
    <span class="page-toolbar-label">Add to page</span>
    <button type="button" data-add-page-item="text">Text</button>
    <button type="button" data-add-page-item="note">Sticky note</button>
    <button type="button" data-add-page-item="list">List/process</button>
    <button type="button" data-add-page-item="image">Image</button>
  `;

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-page-item]");
    if (!button) return;

    promptForCanvasItem(button.dataset.addPageItem, (item) => {
      const items = loadCanvasItems();
      items.push(item);
      saveCanvasItems(items);
      renderCanvasItems();
    });
  });

  document.body.append(toolbar);
};

const initPageCanvas = () => {
  const main = document.querySelector(".landing-shell");
  if (!main) return;

  const canvas = document.createElement("section");
  canvas.className = "page-canvas";
  canvas.setAttribute("data-page-canvas", "");
  canvas.setAttribute("aria-label", "Page content canvas");
  main.append(canvas);

  renderCanvasToolbar();
  renderCanvasItems();
};

const renderTabs = () => {
  const tabList = document.querySelector("[data-folder-tabs]");
  if (!tabList) return;

  const tabs = loadTabs();
  const currentPage = `${normalizePath(window.location.pathname)}${window.location.search}`;
  tabList.innerHTML = "";
  closeTabMenu();

  tabs.forEach((tab, index) => {
    const tabLink = document.createElement("a");
    tabLink.className = "folder-tab";
    tabLink.href = tab.href;
    tabLink.textContent = tab.name;
    tabLink.style.setProperty("--tab-color", tab.color);
    tabLink.setAttribute("data-tab-id", tab.id);

    if (isCurrentTab(tab, index, currentPage)) {
      tabLink.classList.add("is-active");
      tabLink.setAttribute("aria-current", "page");
    }

    tabLink.addEventListener("dblclick", (event) => {
      event.preventDefault();
      tabs[index].name = promptForName(tab);
      saveTabs(tabs);
      renderTabs();
    });

    tabLink.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openTabMenu(event, tabs, index);
    });

    tabList.append(tabLink);
  });

  const addButton = document.createElement("button");
  addButton.className = "folder-tab folder-tab-add";
  addButton.type = "button";
  addButton.setAttribute("aria-label", "Add a new tab");
  addButton.textContent = "+";
  addButton.addEventListener("click", () => {
    const nextNumber = tabs.length + 1;
    const id = `tab-${Date.now()}`;
    const newTab = {
      id,
      name: `Tab ${nextNumber}`,
      color: DEFAULT_COLOR,
      href: createTabHref(id),
    };

    tabs.push(newTab);
    saveTabs(tabs);
    window.location.href = newTab.href;
  });
  tabList.append(addButton);
};

document.addEventListener("click", (event) => {
  if (!event.target.closest(".tab-menu")) closeTabMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeTabMenu();
});
document.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  initPageCanvas();
});

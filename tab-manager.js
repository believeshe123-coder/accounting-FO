const DEFAULT_TABS = [
  { id: "tab-1", name: "Tab 1", color: "#d8e7d2", href: "index.html" },
  { id: "tab-2", name: "Tab 2", color: "#d8e7d2", href: "asset.html" },
];

const STORAGE_KEY = "accounting-fo-folder-tabs";
const DEFAULT_COLOR = "#d8e7d2";

const normalizePath = (path) => path.split("/").pop() || "index.html";

const loadTabs = () => {
  try {
    const savedTabs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(savedTabs) && savedTabs.length > 0) {
      return savedTabs.map((tab, index) => ({
        id: tab.id || `tab-${index + 1}`,
        name: tab.name || `Tab ${index + 1}`,
        color: tab.color || DEFAULT_COLOR,
        href: tab.href || "#",
      }));
    }
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }

  return DEFAULT_TABS;
};

const saveTabs = (tabs) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));

const promptForName = (tab) => {
  const nextName = prompt("Rename tab", tab.name)?.trim();
  return nextName || tab.name;
};

const closeTabMenu = () => document.querySelector(".tab-menu")?.remove();

const openTabMenu = (event, tabs, index) => {
  closeTabMenu();

  const tab = tabs[index];
  const menu = document.createElement("div");
  menu.className = "tab-menu";
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  menu.innerHTML = `
    <button class="tab-menu-item" type="button">Rename tab</button>
    <label class="tab-menu-color">
      <span>Tab color</span>
      <input type="color" value="${tab.color}" />
    </label>
  `;

  menu.querySelector("button").addEventListener("click", () => {
    tabs[index].name = promptForName(tab);
    saveTabs(tabs);
    renderTabs();
  });

  menu.querySelector("input").addEventListener("input", (colorEvent) => {
    tabs[index].color = colorEvent.target.value;
    saveTabs(tabs);
    renderTabs();
  });

  document.body.append(menu);
};

const renderTabs = () => {
  const tabList = document.querySelector("[data-folder-tabs]");
  if (!tabList) return;

  const tabs = loadTabs();
  const currentPage = normalizePath(window.location.pathname);
  tabList.innerHTML = "";
  closeTabMenu();

  tabs.forEach((tab, index) => {
    const tabLink = document.createElement("a");
    tabLink.className = "folder-tab";
    tabLink.href = tab.href;
    tabLink.textContent = tab.name;
    tabLink.style.setProperty("--tab-color", tab.color);
    tabLink.setAttribute("data-tab-id", tab.id);

    if (normalizePath(tab.href) === currentPage || (currentPage === "" && index === 0)) {
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
    tabs.push({
      id: `tab-${Date.now()}`,
      name: `Tab ${nextNumber}`,
      color: DEFAULT_COLOR,
      href: "#",
    });
    saveTabs(tabs);
    renderTabs();
  });
  tabList.append(addButton);
};

document.addEventListener("click", (event) => {
  if (!event.target.closest(".tab-menu")) closeTabMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeTabMenu();
});
document.addEventListener("DOMContentLoaded", renderTabs);

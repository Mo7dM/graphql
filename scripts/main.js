import { getToken, logout } from "./auth.js";
import { loadProfile } from "./profile.js";
import "./login.js";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const topbar = document.getElementById("topbar");

document.getElementById("logoutBtn").addEventListener("click", () => {
  logout();
  showLogin();
});

function showLogin() {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  topbar.classList.add("hidden");
}

async function showDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  topbar.classList.remove("hidden");
  await loadProfile();
}

window.addEventListener("auth:login", showDashboard);
window.addEventListener("auth:logout", showLogin);

// initial load
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
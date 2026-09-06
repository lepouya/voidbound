import { invoke } from "@tauri-apps/api/core";
import type {
  LocalProfilesData,
  PlayerIdentity,
  Revisioned,
} from "./game-state.ts";
import { LocalProfileState } from "./local-profile-state.ts";

const profileState = new LocalProfileState();
let pendingSelection: Promise<void> | null = null;

/** Runs inside the shared loader. Waiting for the player's explicit choice is
 * intentional; a failed initial IPC request rejects into the existing load
 * failure/Retry path, so transport failures do not strand the splash screen. */
export function ensureLocalProfile(): Promise<void> {
  if (profileState.player) return Promise.resolve();
  pendingSelection ??= chooseProfile().catch((error) => {
    pendingSelection = null;
    throw error;
  });
  return pendingSelection;
}

async function chooseProfile(): Promise<void> {
  const data = await invoke<LocalProfilesData>("get_local_profiles");
  if (data.selected) {
    profileState.applyLocalProfileEvent(data.selected);
    return;
  }
  await new Promise<void>((resolve) => {
    const overlay = document.createElement("section");
    overlay.className = "profile-picker";
    overlay.setAttribute("aria-label", "Choose a local profile");
    // Native text entry works with desktop/mobile keyboards. Keep typing and
    // scrolling inside the chooser, away from the engine loading underneath.
    for (
      const event of ["keydown", "keyup", "pointerdown", "pointerup", "wheel"]
    ) {
      overlay.addEventListener(event, (input) => input.stopPropagation());
    }
    const panel = document.createElement("div");
    panel.className = "profile-picker-panel";
    overlay.append(panel);
    const title = document.createElement("h1");
    title.textContent = "Welcome aboard";
    const intro = document.createElement("p");
    intro.textContent =
      "Choose your local profile. Relaunch the game to change profiles.";
    panel.append(title, intro);

    const controls: (HTMLButtonElement | HTMLInputElement)[] = [];
    const status = document.createElement("p");
    status.className = "profile-picker-status";
    status.setAttribute("role", "status");
    let busy = false;
    const begin = async (name: string, create: boolean) => {
      if (busy) return;
      busy = true;
      for (const control of controls) control.disabled = true;
      status.textContent = create
        ? "Creating your profile…"
        : "Loading your profile…";
      try {
        const selected = await invoke<Revisioned<PlayerIdentity>>(
          "request_begin_local_profile",
          { name, create },
        );
        profileState.applyLocalProfileEvent(selected);
        overlay.remove();
        resolve();
      } catch (error) {
        console.warn("request_begin_local_profile rejected:", error);
        status.textContent = `${error}`;
        busy = false;
        for (const control of controls) control.disabled = false;
      }
    };

    const list = document.createElement("div");
    list.className = "profile-picker-list";
    for (const profile of data.profiles) {
      const button = document.createElement("button");
      button.type = "button";
      const name = document.createElement("strong");
      name.textContent = profile.name;
      const summary = document.createElement("span");
      summary.textContent =
        `Saved Command Module · Level ${profile.commandLevel}`;
      button.append(name, summary);
      button.addEventListener(
        "click",
        () => void begin(profile.name, false),
      );
      controls.push(button);
      list.append(button);
    }
    if (data.profiles.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Create your first profile to begin exploring.";
      list.append(empty);
    }
    panel.append(list);

    const form = document.createElement("form");
    const label = document.createElement("label");
    label.textContent = "New profile name";
    label.htmlFor = "local-profile-name";
    const input = document.createElement("input");
    input.id = "local-profile-name";
    input.name = "profileName";
    input.required = true;
    input.autocomplete = "off";
    input.placeholder = "Your name";
    const create = document.createElement("button");
    create.type = "submit";
    create.textContent = "Create & Play";
    controls.push(input, create);
    form.append(label, input, create);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void begin(input.value, true);
    });
    panel.append(form, status);
    document.body.append(overlay);
    if (data.profiles.length > 0) list.querySelector("button")?.focus();
    else input.focus();
  });
}

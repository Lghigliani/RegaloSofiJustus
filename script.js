(() => {
  "use strict";

  const image = document.getElementById("gift-image");
  const countdown = document.getElementById("countdown");
  const status = document.getElementById("gift-status");
  let opened = false;
  let intervalId = null;
  let available = false;

  function parseOpeningDate(value) {
    if (typeof value !== "string") {
      throw new Error("openingdate debe ser un texto.");
    }
    if (value === "") return null;
    if (!/^\d{14}$/.test(value)) {
      throw new Error("Usá el formato YYYYMMDDHHMMSS.");
    }

    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(8, 10));
    const minute = Number(value.slice(10, 12));
    const second = Number(value.slice(12, 14));
    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(hour, minute, second, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute ||
      date.getSeconds() !== second
    ) {
      throw new Error("La fecha indicada no es válida.");
    }
    return date.getTime();
  }

  let openingTime;
  try {
    openingTime = parseOpeningDate(openingdate);
  } catch (error) {
    countdown.hidden = false;
    countdown.textContent = "La fecha de apertura no es válida. Revisá openingdate en config.js.";
    status.textContent = countdown.textContent;
    console.error("Configuración del regalo:", error.message);
    return;
  }

  function updateCountdown() {
    if (opened) return;
    const remaining = openingTime === null ? 0 : openingTime - Date.now();
    available = remaining <= 0;
    image.setAttribute("aria-disabled", String(!available));
    image.tabIndex = available ? 0 : -1;

    if (available) {
      countdown.hidden = true;
      countdown.textContent = "";
      if (status.textContent !== "Ya podés abrir el regalo.") {
        status.textContent = "Ya podés abrir el regalo.";
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }

    const totalSeconds = Math.ceil(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (number) => String(number).padStart(2, "0");
    countdown.hidden = false;
    countdown.textContent =
      `${pad(days)} days, ${pad(hours)} hours, ${pad(minutes)} minutes, ${pad(seconds)} seconds to open...`;
  }

  function openGift() {
    if (opened) return;
    // Comprobar la hora otra vez al hacer clic, sin depender del último intervalo.
    updateCountdown();
    if (!available) return;

    opened = true;
    image.src = "Regalo%20abierto.png";
    image.alt = "Regalo abierto para Sofía y Justus: un viaje a Salta, Jujuy o El Calafate";
    image.classList.add("is-open");
    image.removeAttribute("role");
    image.removeAttribute("aria-label");
    image.removeAttribute("aria-disabled");
    image.removeAttribute("aria-describedby");
    image.removeAttribute("tabindex");
    status.textContent = "¡Regalo abierto! Un viaje a Salta, Jujuy o El Calafate.";
  }

  image.addEventListener("click", openGift);
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGift();
    }
  });

  updateCountdown();
  if (!available) intervalId = setInterval(updateCountdown, 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateCountdown();
  });
})();

(() => {
  "use strict";

  const image = document.getElementById("gift-image");
  const countdown = document.getElementById("countdown");
  const openingTimeLabel = document.getElementById("opening-time");
  const status = document.getElementById("gift-status");
  let opened = false;
  let intervalId = null;
  let available = false;

  function parseWallClock(value) {
    if (typeof value !== "string") {
      throw new Error("openingdate debe ser un texto.");
    }
    if (value === "") return null;
    if (!/^\d{14}$/.test(value)) {
      throw new Error("Usá el formato YYYYMMDDHHMMSS en openingdate.");
    }

    const parts = {
      year: Number(value.slice(0, 4)),
      month: Number(value.slice(4, 6)) - 1,
      day: Number(value.slice(6, 8)),
      hour: Number(value.slice(8, 10)),
      minute: Number(value.slice(10, 12)),
      second: Number(value.slice(12, 14)),
    };

    const probe = new Date(0);
    probe.setFullYear(parts.year, parts.month, parts.day);
    probe.setHours(parts.hour, parts.minute, parts.second, 0);
    if (
      probe.getFullYear() !== parts.year ||
      probe.getMonth() !== parts.month ||
      probe.getDate() !== parts.day ||
      probe.getHours() !== parts.hour ||
      probe.getMinutes() !== parts.minute ||
      probe.getSeconds() !== parts.second
    ) {
      throw new Error("La fecha indicada en openingdate no es válida.");
    }
    return parts;
  }

  function wallClockParts(timestamp, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const values = {};
    for (const part of formatter.formatToParts(new Date(timestamp))) {
      if (part.type !== "literal") values[part.type] = part.value;
    }
    return {
      year: Number(values.year),
      month: Number(values.month) - 1,
      day: Number(values.day),
      hour: Number(values.hour) % 24,
      minute: Number(values.minute),
      second: Number(values.second),
    };
  }

  function offsetAt(timestamp, timeZone) {
    const parts = wallClockParts(timestamp, timeZone);
    return (
      Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second) -
      timestamp
    );
  }

  // Convierte una hora de pared (la que se lee en el reloj) de una zona IANA
  // al instante absoluto en milisegundos. Dos pasadas para resolver el offset
  // real cuando la fecha cae cerca de un cambio de horario de verano.
  function wallClockToEpoch(parts, timeZone) {
    const wallClock = Date.UTC(
      parts.year,
      parts.month,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    let epoch = wallClock - offsetAt(wallClock, timeZone);
    epoch = wallClock - offsetAt(epoch, timeZone);

    const check = wallClockParts(epoch, timeZone);
    if (
      check.year !== parts.year ||
      check.month !== parts.month ||
      check.day !== parts.day ||
      check.hour !== parts.hour ||
      check.minute !== parts.minute ||
      check.second !== parts.second
    ) {
      throw new Error(
        "Esa fecha no existe en la zona horaria indicada (salto de horario de verano)."
      );
    }
    return epoch;
  }

  function isTimeZoneSupported(timeZone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });
      return true;
    } catch (error) {
      return false;
    }
  }

  function resolveOpeningTime(rawDate, rawTimeZone) {
    const parts = parseWallClock(rawDate);
    if (parts === null) return null;

    const timeZone = rawTimeZone == null ? "" : rawTimeZone;
    if (typeof timeZone !== "string") {
      throw new Error("openingtimezone debe ser un texto.");
    }
    const trimmed = timeZone.trim();

    if (trimmed === "") {
      const local = new Date(0);
      local.setFullYear(parts.year, parts.month, parts.day);
      local.setHours(parts.hour, parts.minute, parts.second, 0);
      return local.getTime();
    }

    if (!isTimeZoneSupported(trimmed)) {
      throw new Error(
        `La zona horaria "${trimmed}" no es válida. Usá un nombre IANA, por ejemplo "America/Argentina/Buenos_Aires".`
      );
    }
    return wallClockToEpoch(parts, trimmed);
  }

  let openingTime;
  try {
    openingTime = resolveOpeningTime(openingdate, openingtimezone);
  } catch (error) {
    countdown.hidden = false;
    countdown.textContent = error.message;
    status.textContent = error.message;
    console.error("Configuración del regalo:", error.message);
    return;
  }

  if (openingTime !== null && openingTimeLabel) {
    const localFormatter = new Intl.DateTimeFormat("en", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    openingTimeLabel.textContent =
      `Opening: ${localFormatter.format(new Date(openingTime))} — ${detectedTimeZone}.`;
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
      if (openingTimeLabel) openingTimeLabel.hidden = true;
      if (status.textContent !== "Ya podés abrir el regalo.") {
        status.textContent = "Ya podés abrir el regalo.";
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }

    if (openingTimeLabel) openingTimeLabel.hidden = false;

    const totalSeconds = Math.ceil(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (number) => String(number).padStart(2, "0");
    countdown.hidden = false;
    countdown.textContent =
      `Opening in ${pad(days)} days, ${pad(hours)} hours, ${pad(minutes)} minutes, ${pad(seconds)} seconds...`;
  }

  function openGift() {
    if (opened) return;
    // Comprobar la hora otra vez al hacer clic, sin depender del último intervalo.
    updateCountdown();
    if (!available) return;

    opened = true;
    if (openingTimeLabel) openingTimeLabel.hidden = true;
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

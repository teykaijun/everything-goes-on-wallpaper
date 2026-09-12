/* Local media only. Keep these paths relative so the exported Lively ZIP is portable. */
window.WALLPAPER_CONFIG = {
  daySources: ["media/day-clean.webm"],
  nightSources: ["media/night-clean.webm"],
  // "embedded" uses each video's soundtrack. "separate" uses the OGG files below.
  audioMode: "separate",
  dayAudio: "media/day.ogg",
  nightAudio: "media/night.ogg",
  mode: "automatic",
  dayStartHour: 7,
  nightStartHour: 19,
  transitionSeconds: 8,
  volume: 35,
  luxEnabled: true,
  luxSize: 100,
  luxSpeed: 100,
  luxInteractions: true,
  classroomDesks: true
};

document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("intro-video");
  const overlay = document.getElementById("video-overlay");
  let isFading = false;

  // 1. Check if they've already seen the video in this session
  if (sessionStorage.getItem("videoPlayed")) {
    if (overlay) overlay.style.display = "none";
    return; // Stop the rest of the script from running
  }

  if (video) {
    video.ontimeupdate = function () {
      const timeLeft = video.duration - video.currentTime;

      if (timeLeft <= 1 && !isFading) {
        isFading = true;
        overlay.style.opacity = "0";

        setTimeout(() => {
          overlay.style.display = "none";
          // 2. Mark as played ONLY after it finishes or starts fading
          sessionStorage.setItem("videoPlayed", "true");
        }, 1000);
      }
    };
  }
});

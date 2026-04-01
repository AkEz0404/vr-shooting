document.addEventListener("DOMContentLoaded", () => {
  // const zeroSession = document.getElementById("goToZero");

  const firstSession = document.getElementById("goToFirst");

  const secondSession = document.getElementById("goToSecond");

  const goBack = document.getElementById("goBack");

  // zeroSession.addEventListener("click", () => {
  //   changePage("zeroSession");
  // });
  firstSession.addEventListener("click", () => {
    changePage("zeroSession");
  });
  secondSession.addEventListener("click", () => {
    changePage("secondSession");
  });

  goBack.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});

function changePage(destinationPage) {
  // 1. Define the data you want to send
  const userName = "Player1";
  const difficulty = "hard";

  // 2. Build the URL with "Query Parameters" (the part after the ?)
  // Format: page.html?key=value&key2=value2
  const destination = `../html/${destinationPage}.html?name=${userName}&level=${difficulty}`;
  console.log("should swap");

  // 3. Redirect the user
  window.location.href = destination;
}

const text = "TÜRGENLEŞIGE TAÝYN";
const speed = 100; // Delay in milliseconds per character
let i = 0;

function typeWriter() {
  if (i < text.length) {
    document.getElementById("typewriter").innerHTML += text.charAt(i);
    i++;
    setTimeout(typeWriter, speed);
  }
}

// Start the effect when the window loads
window.onload = typeWriter;

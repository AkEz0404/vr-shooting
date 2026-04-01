document.addEventListener("DOMContentLoaded", () => {
  const exercisesBtn = document.getElementById("goToExercises");

  exercisesBtn.addEventListener("click", () => {
    changePage("exercises");
  });
});

function changePage(destinationPage) {
  // 1. Define the data you want to send
  const userName = "Player1";
  const difficulty = "hard";

  // 2. Build the URL with "Query Parameters" (the part after the ?)
  // Format: page.html?key=value&key2=value2
  // const destination = `./html/${destinationPage}.html?name=${userName}&level=${difficulty}`;		
  const destination = "html/exercises.html";

  // 3. Redirect the user
  window.location.href = destination;
}

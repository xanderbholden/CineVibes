/* ============================================================
   HOMEPAGE BUTTON LOGIC
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("index.js loaded!");

    const kidsBtn = document.getElementById("kidsBtn");
    const adultsBtn = document.getElementById("adultsBtn");
    const perfectBtn = document.getElementById("perfectBtn");

    if (kidsBtn) {
        kidsBtn.addEventListener("click", () => fadeNavigate("kids.html"));
    }

    if (adultsBtn) {
        adultsBtn.addEventListener("click", () => fadeNavigate("adults.html"));
    }

    if (perfectBtn) {
        perfectBtn.addEventListener("click", () => fadeNavigate("best.html"));
    }
});

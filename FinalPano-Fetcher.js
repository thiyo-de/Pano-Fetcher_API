(async function () {
  const endpoint = "https://pano-fetcher.onrender.com";

  // Inject Satoshi font
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.bunny.net/css?family=satoshi:300,400,500,600,700";
  document.head.appendChild(fontLink);

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
  body {
    font-family: "Satoshi", sans-serif !important;
  }

  .pano {
    position: fixed;
    top: 0;
    right: 0;
    width: 250px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: 20px;
    overflow-y: auto;
    overflow-x: hidden;
    white-space: normal;
    z-index: 9999;
    scrollbar-width: none;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }

  .pano::-webkit-scrollbar {
    display: none;
  }

  .card-container {
    position: relative;
    width: 200px;
    height: 150px;
    border-radius: 15px;
    overflow: hidden;
    background-position: center;
    transform-style: preserve-3d;
    box-shadow: 0 0 0 1px rgba(255, 255, 0, 0.15), 0 0 6px 2px rgba(255, 255, 0, 0.08);
    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease-out;
    cursor: grab;
    will-change: transform, box-shadow;
    flex-shrink: 0;
  }

  .card-container:hover {
    box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.6), 0 0 16px 3px rgba(255, 255, 0, 0.3);
  }

  .card-container img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  .inner-border-overlay {
    position: absolute;
    border-radius: 1.375rem;
    pointer-events: none;
    z-index: 10;
    box-shadow:
      inset 0.5px 0.5px 1.5px rgba(255, 235, 180, 0.6),
      inset -1px -1px 1px rgba(160, 110, 0, 0.5),
      inset 3px 3px 6px rgba(0, 0, 0, 0.25);
    transform: translateZ(30px);
    border: 1px solid rgba(255, 214, 102, 0.1);
  }

  .content-area {
    position: absolute;
    inset: 4px;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    z-index: 5;
    transform: translateZ(60px);
  }

  .gradient-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(to top, rgba(10, 10, 10, 0.4), transparent);
    z-index: 15;
    pointer-events: none;
  }

  .text-block {
    position: relative;
    z-index: 20;
    padding-bottom: 10px;
    color: #f8fafc;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    font-size: 15px;
    font-weight: 600;
    font-family: "Satoshi", sans-serif !important;
  }

  .pano-title-bar {
    position: fixed;
    top: 0;
    right: 0;
    width: 250px;
    height: 60px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Satoshi', sans-serif;
    font-weight: 700;
    font-size: 18px;
    color: #f8fafc;
    z-index: 10000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }

  .close-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    cursor: pointer;
    color: #f8fafc;
    background: transparent;
    border: none;
    font-weight: 500;
    padding: 2px 6px;
    transition: color 0.2s ease;
  }

  .close-btn:hover {
    color: #f87171;
  }
  `;
  document.head.appendChild(style);

  const container = document.createElement("div");
  container.id = "thumbnails";
  document.body.appendChild(container);

  await new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.0/vanilla-tilt.min.js";
    script.onload = resolve;
    document.head.appendChild(script);
  });

  async function getScriptCode() {
    try {
      const res = await fetch("./script_general.js");
      return await res.text();
    } catch (err) {
      console.error("❌ script_general.js not found:", err);
      return null;
    }
  }

  async function getLabelOrder() {
    try {
      const res = await fetch("./locale/en.txt");
      const txt = await res.text();
      return txt.split("\n").map(line => {
        const match = line.match(/panorama_([A-Z0-9_]+)\.label\s*=\s*(.+)/);
        return match ? { id: match[1].trim(), label: match[2].trim().replace(/^"|"$/g, "") } : null;
      }).filter(Boolean);
    } catch (err) {
      console.error("❌ Failed to load en.txt:", err);
      return [];
    }
  }

  async function sendToAPI(scriptCode) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: scriptCode,
      });
      const result = await res.json();
      return result.thumbnails || [];
    } catch (err) {
      console.error("❌ Failed to fetch thumbnails:", err);
      return [];
    }
  }

  function renderThumbnails(orderedLabels, allThumbnails) {
    const container = document.getElementById("thumbnails");
    const ordered = orderedLabels.map(({ id, label }) => {
      const match = allThumbnails.find((t) => t.id.includes(id));
      return match ? { ...match, label } : null;
    }).filter(Boolean);

    if (!ordered.length) {
      container.innerHTML = "❌ No matching thumbnails found.";
      return;
    }

    container.innerHTML = `
      <div class="pano-title-bar">
        Panorama
        <button class="close-btn" onclick="document.querySelector('.pano').style.display = 'none'; this.parentElement.style.display='none';">✕</button>
      </div>
      <div class="pano" style="padding-top: 80px;">
        ${ordered.map((t) => `
          <div class="card-container"
            data-label="${t.label}"
            data-tilt
            data-tilt-max="10"
            data-tilt-speed="500"
            data-tilt-perspective="1800"
            data-tilt-glare
            data-tilt-max-glare="0.1"
            data-tilt-scale="1.03"
            data-tilt-reset="true">
            <img src="${t.thumb}" alt="${t.label}" />
            <div class="inner-border-overlay" data-tilt-transform-element></div>
            <div class="content-area p-2" data-tilt-transform-element>
              <div class="gradient-overlay"></div>
              <div class="text-block" data-tilt-transform-element>
                <p>${t.label}</p>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    VanillaTilt.init(document.querySelectorAll("[data-tilt]"));

    document.querySelectorAll(".card-container").forEach((card) => {
      card.addEventListener("click", () => {
        const label = card.getAttribute("data-label");
        if (typeof tour !== "undefined" && typeof tour.setMediaByName === "function") {
          tour.setMediaByName(label);
        } else {
          alert("Panorama selected: " + label);
        }
      });
    });
  }

  const scriptCode = await getScriptCode();
  const labelOrder = await getLabelOrder();

  if (scriptCode && labelOrder.length > 0) {
    const thumbnails = await sendToAPI(scriptCode);
    renderThumbnails(labelOrder, thumbnails);
  }
})();
(() => {
  "use strict";

  const STAT_LABELS = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    special_attack: "Sp. Atk",
    special_defense: "Sp. Def",
    speed: "Speed",
  };

  const els = {
    search: document.getElementById("search"),
    resultsList: document.getElementById("resultsList"),
    emptyState: document.getElementById("emptyState"),
    detailContent: document.getElementById("detailContent"),
    curImg: document.getElementById("curImg"),
    curName: document.getElementById("curName"),
    curTypes: document.getElementById("curTypes"),
    curStats: document.getElementById("curStats"),
    verdictTag: document.getElementById("verdictTag"),
    verdictText: document.getElementById("verdictText"),
    optionsBlock: document.getElementById("optionsBlock"),
    optionsHeading: document.getElementById("optionsHeading"),
    evoOptions: document.getElementById("evoOptions"),
  };

  let ALL = [];
  let byId = new Map();
  let childrenById = new Map(); // speciesId -> [pokemon that evolve from it]

  function bst(stats) {
    return Object.values(stats).reduce((a, b) => a + b, 0);
  }

  function imgUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }
  function imgUrlFallback(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  function setImgWithFallback(imgEl, id, name) {
    imgEl.alt = name;
    imgEl.src = imgUrl(id);
    imgEl.onerror = () => {
      imgEl.onerror = () => { imgEl.onerror = null; };
      imgEl.src = imgUrlFallback(id);
    };
  }

  function init(data) {
    ALL = data;
    byId = new Map(ALL.map((p) => [p.id, p]));
    childrenById = new Map();
    for (const p of ALL) {
      if (p.evolvesFrom != null) {
        if (!childrenById.has(p.evolvesFrom)) childrenById.set(p.evolvesFrom, []);
        childrenById.get(p.evolvesFrom).push(p);
      }
    }
    els.search.addEventListener("input", onSearchInput);
    els.search.addEventListener("focus", onSearchInput);
    document.addEventListener("click", (e) => {
      if (!els.resultsList.contains(e.target) && e.target !== els.search) {
        els.resultsList.innerHTML = "";
      }
    });
  }

  function onSearchInput() {
    const q = els.search.value.trim().toLowerCase();
    els.resultsList.innerHTML = "";
    if (!q) return;
    const matches = ALL.filter((p) => p.name.includes(q)).slice(0, 30);
    if (matches.length === 0) {
      const hint = document.createElement("div");
      hint.className = "result-hint";
      hint.textContent = "No Pokémon matches that search.";
      els.resultsList.appendChild(hint);
      return;
    }
    for (const p of matches) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "result-item";
      btn.setAttribute("role", "option");

      const num = document.createElement("span");
      num.className = "r-num";
      num.textContent = "#" + String(p.id).padStart(3, "0");

      const img = document.createElement("img");
      img.loading = "lazy";
      setImgWithFallback(img, p.id, p.name);

      const label = document.createElement("span");
      label.textContent = p.name;
      label.style.textTransform = "capitalize";

      btn.append(num, img, label);
      btn.addEventListener("click", () => selectPokemon(p.id));
      els.resultsList.appendChild(btn);
    }
  }

  function statRow(statKey, value) {
    const row = document.createElement("div");
    row.className = "stat-row";
    const dt = document.createElement("dt");
    dt.textContent = STAT_LABELS[statKey];
    const dd = document.createElement("dd");
    dd.textContent = value;
    row.append(dt, dd);
    return row;
  }

  function renderCurrent(p) {
    setImgWithFallback(els.curImg, p.id, p.name);
    els.curName.textContent = p.name;

    els.curTypes.innerHTML = "";
    for (const t of p.types) {
      const badge = document.createElement("span");
      badge.className = "type-badge";
      badge.textContent = t;
      els.curTypes.appendChild(badge);
    }

    els.curStats.innerHTML = "";
    for (const key of Object.keys(STAT_LABELS)) {
      els.curStats.appendChild(statRow(key, p.stats[key]));
    }
  }

  function deltaSpan(label, delta) {
    const span = document.createElement("span");
    const cls = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    span.className = cls;
    const sign = delta > 0 ? "+" : "";
    span.textContent = `${label} ${sign}${delta}`;
    return span;
  }

  function renderEvoOption(from, to) {
    const wrap = document.createElement("div");
    wrap.className = "evo-option";

    const img = document.createElement("img");
    setImgWithFallback(img, to.id, to.name);

    const mid = document.createElement("div");
    const name = document.createElement("div");
    name.className = "evo-option-name";
    name.textContent = to.name;

    const deltas = document.createElement("div");
    deltas.className = "delta-list";
    for (const key of Object.keys(STAT_LABELS)) {
      const d = to.stats[key] - from.stats[key];
      deltas.appendChild(deltaSpan(STAT_LABELS[key], d));
    }
    mid.append(name, deltas);

    const totalWrap = document.createElement("div");
    totalWrap.className = "bst-total";
    const totalDelta = bst(to.stats) - bst(from.stats);
    const sign = totalDelta > 0 ? "+" : "";
    totalWrap.innerHTML = `<strong>${bst(to.stats)}</strong>total (${sign}${totalDelta})`;

    wrap.append(img, mid, totalWrap);
    return wrap;
  }

  function biggestGain(from, to) {
    let bestKey = null, bestVal = -Infinity;
    for (const key of Object.keys(STAT_LABELS)) {
      const d = to.stats[key] - from.stats[key];
      if (d > bestVal) { bestVal = d; bestKey = key; }
    }
    return { key: bestKey, value: bestVal };
  }

  function renderVerdict(p, children) {
    els.optionsBlock.hidden = true;
    els.evoOptions.innerHTML = "";

    if (!children || children.length === 0) {
      els.verdictTag.textContent = "Nothing to evolve into";
      els.verdictTag.className = "verdict-tag final";
      els.verdictText.textContent =
        `${cap(p.name)} doesn't have a further evolution in this dataset, so there's no evolve-or-not decision to make here — it's already at the end of its line (or evolves through a method this dataset doesn't track).`;
      return;
    }

    if (children.length === 1) {
      const to = children[0];
      const totalDelta = bst(to.stats) - bst(p.stats);
      const gain = biggestGain(p, to);
      els.verdictTag.textContent = totalDelta >= 0 ? "Evolve" : "Consider waiting";
      els.verdictTag.className = "verdict-tag evolve";
      els.verdictText.textContent =
        `Evolving into ${cap(to.name)} changes its total base stats by ${totalDelta >= 0 ? "+" : ""}${totalDelta}` +
        `, with the biggest jump in ${STAT_LABELS[gain.key].toLowerCase()} (${gain.value >= 0 ? "+" : ""}${gain.value}). ` +
        `${totalDelta >= 0
          ? "Based on stats alone, evolving is the stronger choice."
          : "This is unusual — the next stage has a lower stat total, so it's worth double-checking whether you actually want to evolve it."}`;
    } else {
      els.verdictTag.textContent = `${children.length} evolution paths`;
      els.verdictTag.className = "verdict-tag evolve";
      els.verdictText.textContent =
        `${cap(p.name)} branches into ${children.length} different evolutions, so "should I evolve" really means "which one." ` +
        `Compare the stat changes below before committing.`;
    }

    els.optionsBlock.hidden = false;
    els.optionsHeading.textContent = children.length > 1 ? "Evolution options" : "If it evolves";
    for (const to of children) {
      els.evoOptions.appendChild(renderEvoOption(p, to));
    }
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function selectPokemon(id) {
    const p = byId.get(id);
    if (!p) return;
    els.search.value = p.name;
    els.resultsList.innerHTML = "";
    els.emptyState.style.display = "none";
    els.detailContent.style.display = "block";;
    renderCurrent(p);
    renderVerdict(p, childrenById.get(id));
  }

  fetch("data/pokemon.json")
    .then((r) => r.json())
    .then(init)
    .catch((err) => {
      els.emptyState.innerHTML = `<p>Couldn't load Pokémon data.</p><p class="empty-sub">${err}</p>`;
    });
})();

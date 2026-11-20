(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------- storage (δεν βασιζόμαστε σε αυτό) ----------
  const KEY = "eklasi-unlocked";
  const getUnlocked = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  };
  const isUnlocked = (id) => getUnlocked().includes(id);
  const setUnlocked = (id, on) => {
    try {
      const set = new Set(getUnlocked());
      on ? set.add(id) : set.delete(id);
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch { /* ιδιωτικό παράθυρο κ.λπ. */ }
  };
  // Κρατάμε και στη μνήμη, ώστε να δουλεύει ακόμα κι αν το storage αποτύχει.
  const memUnlocked = new Set();
  const unlocked = (id) => memUnlocked.has(id) || isUnlocked(id);

  // ---------- κείμενο με «περίεργους χαρακτήρες» ----------
  const MARKS = ["́", "̈", "̃", "̶", "̰", "͒", "͓"];
  function weird(s, amt = 1) {
    let out = "";
    for (const ch of s) {
      let c = ch;
      const code = ch.codePointAt(0);
      if (Math.random() < 0.25 * amt) {
        // Ελληνικά → Mathematical Bold Greek (𝚨𝚩𝚪… / 𝛂𝛃𝛄…)
        if (code >= 0x391 && code <= 0x3a9 && code !== 0x3a2) c = String.fromCodePoint(0x1d6a8 + code - 0x391);
        else if (code >= 0x3b1 && code <= 0x3c9) c = String.fromCodePoint(0x1d6c2 + code - 0x3b1);
      }
      if (c === ch && Math.random() < 0.3) c = Math.random() < 0.5 ? c.toUpperCase() : c.toLowerCase();
      out += c;
      if (/\S/.test(ch) && Math.random() < 0.15 * amt) out += pick(MARKS);
    }
    return esc(out);
  }

  const FONTS = [
    "'Comic Sans MS',cursive",
    "Impact,sans-serif",
    "'Courier New',monospace",
    "'Press Start 2P',monospace",
    "Comfortaa,cursive",
    "'Times New Roman',serif",
    "Creepster,fantasy",
  ];
  const wordSoup = (s) =>
    s.split(" ").map((w) =>
      `<span style="font-family:${pick(FONTS)};font-size:${(0.85 + Math.random() * 0.45).toFixed(2)}em">${esc(w)}</span>`
    ).join(" ");

  // ---------- modals ----------
  function modal({ title = "eΚλάση — Μήνυμα", html = "", cls = "", buttons = [], noClose = false } = {}) {
    const ov = $("#overlay");
    ov.innerHTML = "";
    const m = document.createElement("div");
    m.className = "modal " + cls;
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.innerHTML = `
      <div class="titlebar"><span class="tt">${esc(title)}</span>
        <span>${noClose ? "" : '<button data-x="min">_</button><button data-x="max">□</button><button data-x="close">✕</button>'}</span>
      </div>
      <div class="body">${html}</div>`;
    const close = () => {
      if (ov.contains(m)) { ov.hidden = true; ov.innerHTML = ""; }
    };
    if (buttons.length) {
      const foot = document.createElement("div");
      foot.style.cssText = "padding:0 16px 14px;display:flex;gap:10px;flex-wrap:wrap";
      buttons.forEach((b) => {
        const btn = document.createElement("button");
        btn.className = "btn-plain";
        btn.textContent = b.label;
        btn.onclick = () => (b.onClick ? b.onClick(close) : close());
        foot.appendChild(btn);
      });
      m.appendChild(foot);
    }
    if (!noClose) {
      $('[data-x="close"]', m).onclick = close;
      const nope = () => { $(".tt", m).textContent = "Η λειτουργία δεν υποστηρίζεται 🙃"; };
      $('[data-x="min"]', m).onclick = nope;
      $('[data-x="max"]', m).onclick = nope;
    }
    ov.appendChild(m);
    ov.hidden = false;
    const firstBtn = m.querySelector(".body input, .btn-plain");
    if (firstBtn) firstBtn.focus();
    return { el: m, body: $(".body", m), close };
  }

  // ---------- ψεύτικο loading: 0 → 99% → πίσω στο 37% → 100% ----------
  const LOAD_MSGS = [
    "Σύνδεση με τον διακομιστή του 1998...",
    "Ξεσκονίζουμε τις διαφάνειες...",
    "Ζητάμε άδεια από τη Γραμματεία...",
    "Μετατροπή PDF σε PDF...",
    "Περιμένουμε τον καθηγητή να ξυπνήσει...",
  ];
  function fakeLoad(label, { short = false } = {}) {
    return new Promise((resolve) => {
      const md = modal({
        title: label,
        noClose: true,
        html: `<div class="loadmsg"></div><div class="pct">0%</div><div class="fakebar"><i style="width:0"></i></div>`,
      });
      const msg = $(".loadmsg", md.body), pct = $(".pct", md.body), bar = $(".fakebar > i", md.body);
      let p = 0, phase = 0, hold = 0;
      const set = (v) => { p = v; pct.textContent = Math.floor(v) + "%"; bar.style.width = v + "%"; };
      const order = shuffle(LOAD_MSGS);
      const tick = setInterval(() => {
        if (phase === 0) {
          set(Math.min(99, p + Math.random() * 9));
          msg.textContent = order[Math.min(order.length - 1, Math.floor(p / 25))];
          if (p >= 99) phase = 1;
        } else if (phase === 1) {
          msg.textContent = "Σχεδόν έτοιμο... ⏳";
          if (++hold > 8) {
            if (short) phase = 3;
            else { set(37); msg.textContent = "Ουπς! Κάτι πήγε στραβά. Ξαναπροσπαθούμε από το 37% 🙃"; phase = 2; }
          }
        } else if (phase === 2) {
          set(Math.min(100, p + Math.random() * 12));
          if (p >= 100) phase = 3;
        } else {
          set(100);
          clearInterval(tick);
          setTimeout(() => { md.close(); resolve(); }, 250);
        }
      }, 90);
    });
  }

  // ---------- κουμπιά που φεύγουν ----------
  const TAUNTS = ["Πιάσε με! 😜", "Όχι ακόμα", "Χαχα", "Πιο γρήγορα!"];
  function runaway(btn, times) {
    let n = 0;
    const flee = (e) => {
      if (n >= times) return;
      n++;
      if (e.type === "touchstart") e.preventDefault();
      const r = btn.getBoundingClientRect();
      btn.classList.add("runaway");
      btn.style.left = 10 + Math.random() * Math.max(0, innerWidth - r.width - 20) + "px";
      btn.style.top = 60 + Math.random() * Math.max(0, innerHeight - r.height - 120) + "px";
      btn.title = pick(TAUNTS);
    };
    btn.addEventListener("mouseenter", flee);
    btn.addEventListener("touchstart", flee, { passive: false });
  }

  // ---------- αρχική ----------
  const ANNOUNCEMENTS = [
    "📌 Το μάθημα της Τετάρτης μεταφέρεται την Τετάρτη.",
    "📌 Οι βαθμοί θα ανακοινωθούν σύντομα™.",
    "📌 Η αίθουσα Α1 μετονομάστηκε σε «Α1-νέα-ΤΕΛΙΚΗ».",
    "📌 Ο server κλείνει καθημερινά 09:00–21:00 για συντήρηση.",
    "📌 Οι διαφάνειες ανοίγουν ΜΟΝΟ με τεστ 5 ερωτήσεων.",
  ];

  function renderHome() {
    const rows = COURSES.map((c) => `
      <tr>
        <td><span class="code">${esc(c.code)}</span></td>
        <td><span class="ctitle">${weird(c.title)}</span><br><span class="prof">${esc(c.prof)}</span></td>
        <td>${unlocked(c.id) ? "🔓" : "🔒"}</td>
        <td>
          <button class="big-useless" data-useless>ΑΠΕΓΓΡΑΦΗ</button><br>
          <a class="enter-link" href="#/course/${c.id}">είσοδος →</a>
        </td>
      </tr>`).join("");

    app.innerHTML = `
      <div class="panel">
        <h1>${weird("Καλωσήρθατε στην eΚλάση!!!")}</h1>
        <p>Έχετε <b>${COURSES.length}</b> μαθήματα και <b class="blink">2.147.483.647</b> μη αναγνωσμένες ανακοινώσεις.</p>
        <p class="tiny">Συμβουλή: για να μπείτε σε μάθημα, πατήστε το μικροσκοπικό μπλε «είσοδος». ΟΧΙ το μεγάλο κόκκινο κουμπί.</p>
      </div>
      <div class="home-grid">
        <div class="panel">
          <h2>ΤΑ ΜΑΘΗΜΑΤΑ ΜΟΥ</h2>
          <table class="course-table">
            <tr><th>Κωδ.</th><th>Μάθημα / Διδάσκων</th><th>?</th><th>Ενέργειες</th></tr>
            ${rows}
          </table>
        </div>
        <div>
          <div class="sidebox">
            <h3 class="wobble">ΑΝΑΚΟΙΝΩΣΕΙΣ</h3>
            <ul>${ANNOUNCEMENTS.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
          </div>
          <div class="sidebox">
            <h3>ΗΜΕΡΟΛΟΓΙΟ</h3>
            <p>Δεν υπάρχουν γεγονότα. Ή υπάρχουν. Δεν είμαστε σίγουροι.</p>
          </div>
        </div>
      </div>`;

    app.querySelectorAll("[data-useless]").forEach((b) => {
      b.onclick = () => modal({
        cls: "bad",
        title: "Απεγγραφή",
        html: "Δεν μπορείτε να απεγγραφείτε.<br>Δεν μπορείτε ΠΟΤΕ να φύγετε. 👁️",
        buttons: [{ label: "Το αποδέχομαι" }],
      });
    });
  }

  // ---------- σελίδα μαθήματος ----------
  const TOOLS = [
    ["📢", "Ανακοινώσεις"], ["📁", "Έγγραφα", "files"], ["🖼️", "Διαφάνειες", "slides"], ["📝", "Εργασίες"],
    ["💯", "Βαθμολογίες"], ["🎥", "Τηλεσυνεργασία"], ["💬", "Forum"], ["🧾", "Ασκήσεις"],
  ];

  function renderCourse(id, skipLoad = false) {
    const c = COURSES.find((x) => x.id === id);
    if (!c) { location.hash = "#/"; return; }
    const open = unlocked(c.id);

    app.innerHTML = `
      <div class="panel">
        <p class="tiny"><a href="#/">Αρχική</a> » Μαθήματα » ${esc(c.code)} » ... » ... » εδώ</p>
        <h1>${weird(c.title)}</h1>
        <p><span class="code">${esc(c.code)}</span> · <span class="prof">${esc(c.prof)}</span> · Εξάμηνο: ${esc(c.semester)}</p>
      </div>
      <div class="course-wrap">
        <aside class="tools">
          ${TOOLS.map(([ic, name, target]) =>
            `<button class="${open ? "" : "locked"}" data-target="${target || ""}">${name} ${ic}</button>`).join("")}
        </aside>
        <section id="course-main"></section>
      </div>`;

    app.querySelectorAll(".tools button").forEach((b) => {
      b.onclick = () => {
        if (!open) {
          modal({ title: "Κλειδωμένο", html: "<p>🔒 Περάστε πρώτα το τεστ εισόδου. Μετά ίσως.</p>", buttons: [{ label: "Οκ 😔" }] });
        } else if (b.dataset.target) {
          document.getElementById(b.dataset.target).scrollIntoView({ behavior: "smooth" });
        } else {
          modal({ html: "<p>Το εργαλείο είναι προσωρινά μη διαθέσιμο (από το 2014).</p>", buttons: [{ label: "Λογικό" }] });
        }
      };
    });

    const main = $("#course-main");
    open ? renderMaterial(c, main) : renderQuizIntro(c, main);
    if (!skipLoad) fakeLoad("Φόρτωση μαθήματος " + c.code, { short: true });
  }

  function renderQuizIntro(c, main) {
    main.innerHTML = `
      <div class="panel">
        <h2>ΤΕΣΤ ΕΙΣΟΔΟΥ</h2>
        <p>Για να ανοίξουν οι διαφάνειες και το υλικό, απαντήστε σωστά σε <b class="blink">5 ερωτήσεις</b>.</p>
        <p>⚠️ Ένα λάθος = <u>ΑΠΟ ΤΗΝ ΑΡΧΗ</u>. Δεν υπάρχει πίσω. Δεν υπάρχει μπροστά. Υπάρχει μόνο το τεστ.</p>
        <p class="tiny">Πατώντας «Ξεκίνα» αποδέχεστε τους 47 όρους χρήσης που δεν θα διαβάσετε ποτέ.</p>
        <button class="submit" id="start">ΞΕΚΙΝΑ ▶▶</button>
      </div>`;
    const start = $("#start", main);
    runaway(start, 2);
    start.onclick = () => renderQuiz(c, main);
  }

  const FAKE_PROGRESS = [80, 12, 99, 3, 50];

  function renderQuiz(c, main) {
    let i = 0;

    function draw() {
      const q = c.quiz[i];
      let sel = null;
      main.innerHTML = `
        <div class="panel"><div class="qbox">
          <div class="qnum">ΕΡΩΤΗΣΗ ${i + 1} / ${c.quiz.length} <span class="blink">⏰</span></div>
          <div class="fakebar-wrap">Πρόοδος εξέτασης: ${FAKE_PROGRESS[i]}%
            <div class="fakebar"><i style="width:${FAKE_PROGRESS[i]}%"></i></div></div>
          <div class="qtext">${wordSoup(q.q)}</div>
          <div class="opts">${shuffle([0, 1, 2, 3]).map((k) =>
            `<button class="opt" data-k="${k}">${esc(q.a[k])}</button>`).join("")}</div>
          <button class="submit" id="sub">ΥΠΟΒΟΛΗ ✔</button>
          <p class="tiny">Υπόδειξη: η σωστή απάντηση είναι μία από τις παραπάνω.</p>
        </div></div>`;

      const opts = $(".opts", main);
      opts.addEventListener("click", (e) => {
        const b = e.target.closest(".opt");
        if (!b) return;
        opts.querySelectorAll(".opt").forEach((o) => o.classList.remove("sel"));
        b.classList.add("sel");
        sel = +b.dataset.k;
      });
      // Οι απαντήσεις αλλάζουν θέση μία φορά, μόλις πας να διαλέξεις.
      let reshuffled = false;
      opts.addEventListener("mouseenter", () => {
        if (reshuffled) return;
        reshuffled = true;
        setTimeout(() => shuffle([...opts.children]).forEach((ch) => opts.appendChild(ch)), 450);
      });

      const sub = $("#sub", main);
      runaway(sub, i % 2 === 0 ? 2 : 1);
      sub.onclick = () => {
        if (sel === null) {
          modal({ html: "<p>Δεν επιλέξατε απάντηση. Η σιωπή δεν είναι απάντηση (εκτός από τη Φιλοσοφία).</p>", buttons: [{ label: "Συγγνώμη 🙇" }] });
          return;
        }
        if (sel === q.c) {
          i++;
          if (i === c.quiz.length) { captcha(c); return; }
          const md = modal({ cls: "good", title: "Σωστό!", html: "<p>✅ Σωστό! (κατά τύχη;) Πάμε στην επόμενη...</p>" });
          setTimeout(() => { md.close(); draw(); }, 1100);
        } else {
          modal({
            cls: "bad",
            title: "ΣΦΑΛΜΑ ΣΥΣΤΗΜΑΤΟΣ",
            noClose: true,
            html: "ΛΑΘΟΣ!!!<br>Πίσω στην ερώτηση 1 🙃",
            buttons: [{
              label: "Εντάξει 😭",
              onClick: (close) => {
                close();
                i = 0;
                fakeLoad("Επαναφορά εξέτασης", { short: true }).then(draw);
              },
            }],
          });
        }
      };
    }

    draw();
  }

  function captcha(c) {
    const md = modal({
      title: "Επαλήθευση ανθρώπου",
      noClose: true,
      html: `
        <p>🎉 Περάσατε το τεστ! Ένα τελευταίο βήμα:</p>
        <label class="captcha-row"><input type="checkbox" id="cb"> <span id="cbt">Δεν είμαι ρομπότ</span></label>
        <div class="captcha-q" id="cq" hidden>
          <p>Για επιβεβαίωση: πόσο κάνει <b>7 × 8</b>;</p>
          <input id="ca" inputmode="numeric" autocomplete="off"> <button class="btn-plain" id="cok">Επιβεβαίωση</button>
          <p id="cerr"></p>
        </div>`,
    });
    const cb = $("#cb", md.body);
    let tries = 0;
    cb.addEventListener("change", () => {
      tries++;
      if (tries === 1) {
        cb.checked = false;
        $("#cbt", md.body).textContent = "Είστε σίγουροι; Αυτό λένε όλα τα ρομπότ. Πατήστε ξανά.";
        return;
      }
      if (cb.checked) { $("#cq", md.body).hidden = false; $("#ca", md.body).focus(); }
    });
    const check = () => {
      if ($("#ca", md.body).value.trim() === "56") {
        memUnlocked.add(c.id);
        setUnlocked(c.id, true);
        md.close();
        fakeLoad("Αποσυμπίεση διαφανειών (.rar)").then(() => renderCourse(c.id, true));
      } else {
        $("#cerr", md.body).textContent = "❌ Λάθος. Αλλά δεν θα σας στείλουμε πίσω στην αρχή. Σήμερα.";
      }
    };
    $("#cok", md.body).onclick = check;
    $("#ca", md.body).addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
  }

  function renderMaterial(c, main) {
    let s = 0;
    let firstNext = true;
    main.innerHTML = `
      <div class="panel" id="slides"><h2>ΔΙΑΦΑΝΕΙΕΣ</h2><div id="slidebox"></div></div>
      <div class="panel" id="files">
        <h2>ΕΓΓΡΑΦΑ &amp; ΥΛΙΚΟ</h2>
        <ul class="files">${FILES.map((f, k) =>
          `<li><a href="javascript:void(0)" data-f="${k}">${esc(f.name)}</a> <span class="size">(${esc(f.size)})</span></li>`).join("")}</ul>
        <button class="btn-plain" id="relock">🔁 Κλείδωμα ξανά (για επίδειξη)</button>
      </div>`;
    const box = $("#slidebox", main);

    function drawSlide() {
      const sl = c.slides[s];
      box.innerHTML = `
        <div class="slide"><h2>${weird(sl.t, 0.5)}</h2><ul>${sl.b.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
        <div class="slide-nav">
          <button id="nx">◀ Επόμενη</button>
          <span class="tiny">Διαφάνεια ${s + 1} από ${c.slides.length} (περίπου)</span>
          <button id="pv">Προηγούμενη ▶</button>
        </div>`;
      const nx = $("#nx", box);
      if (firstNext) { runaway(nx, 1); firstNext = false; }
      nx.onclick = () => {
        if (s < c.slides.length - 1) { s++; drawSlide(); return; }
        const again = (close) => { close(); s = 0; drawSlide(); };
        modal({
          html: "<p>Τέλος διαφανειών. Θέλετε να ξεκινήσετε από την αρχή;</p>",
          buttons: [{ label: "Ναι", onClick: again }, { label: "Ναι, αλλά πιο έντονα", onClick: again }],
        });
      };
      $("#pv", box).onclick = () => {
        if (s > 0) { s--; drawSlide(); return; }
        modal({ html: "<p>Δεν υπάρχει προηγούμενη διαφάνεια. Ή μήπως υπάρχει; 🤔</p>", buttons: [{ label: "Υπάρχει;" }] });
      };
    }
    drawSlide();

    main.querySelectorAll("[data-f]").forEach((a) => {
      a.onclick = () => {
        const f = FILES[+a.dataset.f];
        fakeLoad("Λήψη: " + f.name).then(() =>
          modal({ title: f.name, html: `<pre>${esc(f.body.replace("{course}", c.title))}</pre>`, buttons: [{ label: "Κλείσιμο" }] })
        );
      };
    });

    $("#relock", main).onclick = () => {
      memUnlocked.delete(c.id);
      setUnlocked(c.id, false);
      renderCourse(c.id, true);
    };
  }

  // ---------- παντού: ψεύτικα links, φόντο, μετρητής, ουρά κέρσορα ----------
  const NOPE = [
    "Η λειτουργία θα είναι διαθέσιμη στην έκδοση 2.0 (εκτιμώμενη κυκλοφορία: 2031).",
    "Error 418: Είμαι τσαγιέρα. ☕",
    "Παρακαλώ συνδεθείτε για να συνδεθείτε.",
    "Η σελίδα δεν βρέθηκε. Ούτε εμείς τη βρίσκουμε.",
  ];
  document.querySelectorAll(".nav-a.fake").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      modal({ html: `<p>${esc(pick(NOPE))}</p>`, buttons: [{ label: "Κατανοητό" }] });
    });
  });

  $("#bg-tiles").textContent = "📚🤡📐💾📎🧮⏳💀📉🖨️🦆".repeat(450);

  let visits = 42;
  setInterval(() => {
    visits += Math.floor(Math.random() * 4);
    $("#counter").textContent = String(visits).padStart(9, "0");
  }, 700);

  const TRAIL = ["📚", "✏️", "💀", "📎", "⏳", "🤯", "📉"];
  let lastTrail = 0;
  addEventListener("mousemove", (e) => {
    const now = Date.now();
    if (now - lastTrail < 45) return;
    lastTrail = now;
    const t = document.createElement("span");
    t.className = "trail";
    t.textContent = pick(TRAIL);
    t.style.left = e.clientX + 8 + "px";
    t.style.top = e.clientY + 8 + "px";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1000);
  });

  // ---------- router ----------
  function route() {
    scrollTo(0, 0);
    const m = (location.hash || "#/").match(/^#\/course\/([\w-]+)/);
    m ? renderCourse(m[1]) : renderHome();
  }
  addEventListener("hashchange", route);
  route();

  let seen = false;
  try { seen = sessionStorage.getItem("eklasi-seen") === "1"; sessionStorage.setItem("eklasi-seen", "1"); } catch { /* ok */ }
  if (!seen && !location.hash.startsWith("#/course/")) fakeLoad("Σύνδεση μέσω dial-up 56k", { short: true });
})();

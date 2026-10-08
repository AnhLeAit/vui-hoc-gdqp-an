/* Vui học GDQP&AN – ứng dụng một trang, không cần server.
   Dữ liệu: window.QUIZ_DATA (sinh bởi tools/build_data.py). */
(() => {
  "use strict";

  const DATA = window.QUIZ_DATA;
  const $ = (s) => document.querySelector(s);
  const LETTERS = ["A", "B", "C", "D", "E", "F"];

  if (!DATA || !DATA.modules) {
    document.body.innerHTML = '<p style="color:#fff;padding:40px;font-size:20px">Không tìm thấy dữ liệu. Hãy chạy <code>python3 tools/build_data.py</code>.</p>';
    return;
  }

  /* ===================== LƯU TRỮ ===================== */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("gdqp." + key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("gdqp." + key, JSON.stringify(value)); } catch { /* bỏ qua */ }
    },
  };
  const progress = store.get("progress", {});
  const progressKey = (m, l, s) => `${m.id}/${l.id}/${s.id}`;

  /* ===================== ÂM THANH ===================== */
  const audio = (() => {
    const bg = $("#bgMusic");
    const jingle = $("#examMusic");
    let volume = store.get("volume", 50) / 100;
    let musicOn = store.get("music", true);
    let ctx = null;
    let unlocked = false;

    const ensureCtx = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    };

    const applyVolume = () => {
      bg.volume = Math.min(1, volume * 0.55);
      jingle.volume = Math.min(1, volume);
    };
    applyVolume();

    function tone(freq, start, dur, { type = "sine", gain = 0.25, slide = 0 } = {}) {
      const c = ensureCtx();
      if (!c || volume === 0) return;
      const t = c.currentTime + start;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain * volume, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    const sfx = {
      click: () => tone(660, 0, 0.08, { type: "triangle", gain: 0.15 }),
      pick: () => tone(520, 0, 0.12, { type: "triangle", gain: 0.2, slide: 1.3 }),
      correct: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, { type: "triangle", gain: 0.22 })); },
      wrong: () => { tone(220, 0, 0.18, { type: "sawtooth", gain: 0.14 }); tone(165, 0.16, 0.32, { type: "sawtooth", gain: 0.14, slide: 0.8 }); },
      reveal: () => { tone(880, 0, 0.3, { gain: 0.15 }); tone(1320, 0.1, 0.4, { gain: 0.1 }); },
      tick: () => tone(1200, 0, 0.05, { type: "square", gain: 0.06 }),
      bell: () => {
        for (let k = 0; k < 3; k++) {
          [1, 2.76, 5.4].forEach((m, i) => tone(740 * m, k * 1.1, 1.6 - i * 0.4, { gain: 0.22 / (i + 1) }));
        }
      },
      fanfare: () => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, i === 5 ? 0.7 : 0.18, { type: "triangle", gain: 0.2 })); },
    };

    function playBg() {
      if (!musicOn || !unlocked || !jingle.paused) return;
      bg.play().catch(() => {});
    }

    return {
      sfx,
      unlock() {
        if (unlocked) return;
        unlocked = true;
        ensureCtx();
        playBg();
      },
      get volume() { return volume; },
      setVolume(v) {
        volume = v;
        store.set("volume", Math.round(v * 100));
        applyVolume();
      },
      get musicOn() { return musicOn; },
      toggleMusic() {
        musicOn = !musicOn;
        store.set("music", musicOn);
        if (musicOn) playBg(); else bg.pause();
        return musicOn;
      },
      /** Nhạc kết thúc bài thi: tạm dừng nhạc nền, phát 1 lần rồi quay lại nhạc nền. */
      playJingle() {
        bg.pause();
        jingle.loop = false;
        jingle.currentTime = 0;
        jingle.play().catch(() => {});
        jingle.onended = playBg;
      },
      stopJingle() {
        if (!jingle.paused) { jingle.pause(); playBg(); }
      },
    };
  })();

  /* ===================== HIỆU ỨNG PHÁO GIẤY ===================== */
  const fx = (() => {
    const canvas = $("#fx");
    const g = canvas.getContext("2d");
    const colors = ["#ffe36e", "#19b33a", "#fe3b3b", "#2b7de9", "#ffffff", "#ff9f1c"];
    let parts = [];
    let running = false;

    const resize = () => {
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
    };
    addEventListener("resize", resize);
    resize();

    function frame() {
      g.clearRect(0, 0, canvas.width, canvas.height);
      const dpr = devicePixelRatio;
      parts = parts.filter((p) => p.life > 0);
      for (const p of parts) {
        p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
        g.save();
        g.globalAlpha = Math.min(1, p.life / 40);
        g.translate(p.x * dpr, p.y * dpr);
        g.rotate(p.rot);
        g.fillStyle = p.c;
        if (p.star) { g.font = `${p.s * 2.4 * dpr}px serif`; g.fillText("★", 0, 0); }
        else g.fillRect(-p.s * dpr / 2, -p.s * dpr / 4, p.s * dpr, p.s * dpr / 2);
        g.restore();
      }
      if (parts.length) requestAnimationFrame(frame);
      else { running = false; g.clearRect(0, 0, canvas.width, canvas.height); }
    }

    function burst(x, y, n = 60, spread = 1) {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (3 + Math.random() * 7) * spread;
        parts.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          s: 6 + Math.random() * 7, c: colors[(Math.random() * colors.length) | 0], life: 70 + Math.random() * 50, star: Math.random() < 0.15,
        });
      }
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    return {
      burst,
      fromEl(el, n) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, n); },
      celebrate() {
        burst(innerWidth * 0.2, innerHeight * 0.6, 90, 1.3);
        setTimeout(() => burst(innerWidth * 0.8, innerHeight * 0.6, 90, 1.3), 250);
        setTimeout(() => burst(innerWidth * 0.5, innerHeight * 0.35, 120, 1.5), 550);
      },
    };
  })();

  /* ===================== TIỆN ÍCH GIAO DIỆN ===================== */
  let toastTimer;
  function toast(msg, kind = "") {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show " + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast " + kind), 1800);
  }

  function setTitle(text) {
    const el = $("#topbarTitle");
    if (el.textContent === text) return;
    el.textContent = text;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  let currentScreen = null;
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + id));
    currentScreen = id;
    document.body.dataset.screen = id;
  }

  const modal = {
    el: $("#modal"),
    open(title, bodyHTML, actions) {
      $("#modalTitle").textContent = title;
      $("#modalBody").innerHTML = bodyHTML;
      const box = $("#modalActions");
      box.innerHTML = "";
      actions.forEach(({ label, cls = "", onClick }) => {
        const b = document.createElement("button");
        b.className = "btn " + cls;
        b.textContent = label;
        b.addEventListener("click", () => { audio.sfx.click(); onClick ? onClick() : modal.close(); });
        box.appendChild(b);
      });
      this.el.hidden = false;
      box.lastElementChild?.focus();
    },
    close() { this.el.hidden = true; },
    get isOpen() { return !this.el.hidden; },
  };
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") modal.close(); });

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const countQuestions = (lesson) => lesson.sets.reduce((n, s) => n + s.questions.length, 0);

  /* ===================== TRANG CHỦ ===================== */
  function renderHome() {
    const box = $("#moduleCards");
    box.innerHTML = "";
    DATA.modules.forEach((m, mi) => {
      const lessons = m.lessons.filter((l) => l.type === "lesson");
      const exam = m.lessons.find((l) => l.type === "exam");
      const done = lessons.filter((l) => l.sets.some((s) => progress[progressKey(m, l, s)])).length;
      const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
      const card = document.createElement("button");
      card.className = "module-card";
      card.style.animationDelay = 0.3 + mi * 0.15 + "s";
      card.innerHTML = `
        <span class="mc-num">${mi + 1}</span>
        <h3>${escapeHTML(m.name)}</h3>
        <p>${lessons.length} bài học${exam ? " · 1 đề thi thử" : ""}</p>
        <div class="mc-meta">
          <span>📘 ${lessons.reduce((n, l) => n + countQuestions(l), 0)} câu ôn tập</span>
          ${exam ? `<span>⏱️ ${countQuestions(exam)} câu ngân hàng thi</span>` : ""}
        </div>
        <div class="mc-progress" title="Đã học ${done}/${lessons.length} bài"><i></i></div>`;
      card.addEventListener("click", () => { audio.sfx.click(); openModule(mi); });
      box.appendChild(card);
      requestAnimationFrame(() => requestAnimationFrame(() => (card.querySelector(".mc-progress i").style.width = pct + "%")));
    });
  }

  function goHome() {
    stopTimer();
    session = null;
    renderHome();
    setTitle("Vui học GDQP&AN");
    show("home");
  }

  /* ===================== DANH SÁCH BÀI ===================== */
  let module = null;

  function openModule(mi) {
    module = DATA.modules[mi];
    stopTimer();
    session = null;
    setTitle(module.name);
    $("#moduleName").textContent = module.name;
    const lessons = module.lessons.filter((l) => l.type === "lesson");
    const exam = module.lessons.find((l) => l.type === "exam");
    $("#moduleStats").textContent = `${lessons.length} bài học · ${lessons.reduce((n, l) => n + countQuestions(l), 0)} câu ôn tập` +
      (exam ? ` · Thi thử ${countQuestions(exam)} câu` : "");

    const grid = $("#lessonGrid");
    grid.innerHTML = "";
    module.lessons.forEach((l, i) => {
      const b = document.createElement("button");
      b.className = "lesson-btn" + (l.type === "exam" ? " exam" : "");
      b.style.setProperty("--i", i);
      const best = Math.max(-1, ...l.sets.map((s) => progress[progressKey(module, l, s)]?.best ?? -1));
      b.innerHTML = `<span>${escapeHTML(l.name)}</span><span class="lb-meta">${countQuestions(l)} câu</span>` +
        (best >= 0 ? `<span class="lb-best">★ ${best}</span><span class="lb-bar" style="width:${best * 10}%"></span>` : "");
      b.addEventListener("click", () => { audio.sfx.click(); openLesson(l); });
      grid.appendChild(b);
    });
    show("module");
  }

  function openLesson(lesson) {
    const start = (set) => (lesson.type === "exam" ? examSetup(lesson, set) : startSession({ mode: "lesson", lesson, set }));
    if (lesson.sets.length === 1) return start(lesson.sets[0]);
    modal.open(
      `${lesson.name} – chọn đề`,
      `<div class="chips">${lesson.sets.map((s, i) => `<button class="chip" data-set="${i}">${escapeHTML(s.name)} · ${s.questions.length} câu</button>`).join("")}</div>`,
      [{ label: "Đóng", cls: "ghost" }],
    );
    $("#modalBody").querySelectorAll("[data-set]").forEach((b) =>
      b.addEventListener("click", () => { modal.close(); start(lesson.sets[+b.dataset.set]); }));
  }

  function examSetup(lesson, set) {
    const total = set.questions.length;
    const counts = [20, 30, 40, 50].filter((n) => n < total).concat(total);
    const saved = store.get("examCfg", { count: 30, minutes: 30 });
    let count = counts.includes(saved.count) ? saved.count : counts[Math.min(1, counts.length - 1)];
    let minutes = saved.minutes;
    const mins = [15, 30, 45, 60, 90];
    modal.open(
      `${module.name} – Thi thử`,
      `<p>Đề được chọn ngẫu nhiên từ ngân hàng <b>${total}</b> câu. Đáp án chỉ hiện sau khi nộp bài.</p>
       <div class="field"><label>Số câu hỏi</label><div class="chips" id="cfgCount">
         ${counts.map((n) => `<button class="chip${n === count ? " on" : ""}" data-v="${n}">${n === total ? `Tất cả (${n})` : n}</button>`).join("")}
       </div></div>
       <div class="field"><label>Thời gian</label><div class="chips" id="cfgTime">
         ${mins.map((n) => `<button class="chip${n === minutes ? " on" : ""}" data-v="${n}">${n} phút</button>`).join("")}
       </div></div>`,
      [
        { label: "Huỷ", cls: "ghost" },
        {
          label: "Bắt đầu thi ▶", cls: "danger", onClick: () => {
            modal.close();
            store.set("examCfg", { count, minutes });
            startSession({ mode: "exam", lesson, set, count, minutes });
          },
        },
      ],
    );
    const bindChips = (id, setter) => {
      const wrap = $(id);
      wrap.addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        audio.sfx.tick();
        wrap.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b));
        setter(+b.dataset.v);
      });
    };
    bindChips("#cfgCount", (v) => (count = v));
    bindChips("#cfgTime", (v) => (minutes = v));
  }

  /* ===================== PHIÊN HỌC / THI ===================== */
  let session = null;
  let timerId = null;

  /** Tạo bản câu hỏi đã trộn phương án (dữ liệu gốc luôn để đáp án đúng ở vị trí 1). */
  function makeItem(q) {
    let order = q.options.map((_, i) => i);
    if (q.shuffle !== false) {
      const pinned = q.pinLast;
      order = shuffle(order.filter((i) => i !== pinned));
      if (pinned != null) order.push(pinned);
    }
    return { q, order, answerPos: order.indexOf(q.answer), picked: null, revealed: false };
  }

  function startSession(cfg) {
    const { mode, set } = cfg;
    let qs = set.questions;
    if (mode === "exam") qs = shuffle(qs).slice(0, cfg.count);
    session = {
      ...cfg,
      items: qs.map(makeItem),
      idx: 0,
      correct: 0,
      startedAt: Date.now(),
      endsAt: mode === "exam" ? Date.now() + cfg.minutes * 60000 : null,
      finished: false,
    };
    audio.stopJingle();
    setTitle(`${module.name} · ${cfg.lesson.name}`);
    const screen = $("#screen-quiz");
    screen.dataset.mode = mode;
    const chip = $("#qMode");
    chip.textContent = mode === "exam" ? "Thi thử" : "Luyện tập";
    chip.classList.toggle("exam", mode === "exam");
    $("#scoreNum").textContent = "0";
    buildList();
    renderQuestion(1);
    show("quiz");
    if (mode === "exam") startTimer();
    else updateProgress();
  }

  function buildList() {
    const list = $("#qList");
    list.innerHTML = "";
    session.items.forEach((_, i) => {
      const b = document.createElement("button");
      b.textContent = `Câu ${i + 1}`;
      b.addEventListener("click", () => { audio.sfx.tick(); goTo(i); });
      list.appendChild(b);
    });
  }

  function listState(i) {
    const it = session.items[i];
    const b = $("#qList").children[i];
    b.className = "";
    if (i === session.idx) b.classList.add("current");
    const graded = session.mode !== "exam";
    if (it.picked != null) {
      if (!graded) b.classList.add("picked");
      else b.classList.add(it.picked === it.answerPos ? "correct" : "wrong");
    } else if (it.revealed && graded) b.classList.add("revealed");
  }

  function renderQuestion(dir = 1) {
    const s = session;
    const it = s.items[s.idx];
    const isLocked = s.mode === "review" || (s.mode === "lesson" && (it.picked != null || it.revealed));

    const qText = $("#qText");
    qText.textContent = `Câu ${s.idx + 1}: ${it.q.question}`;
    qText.classList.remove("enter", "enter-back");
    void qText.offsetWidth;
    qText.classList.add(dir < 0 ? "enter-back" : "enter");
    $("#qCounter").textContent = `${s.idx + 1} / ${s.items.length}`;

    const box = $("#options");
    box.innerHTML = "";
    it.order.forEach((origIdx, pos) => {
      const b = document.createElement("button");
      b.className = "option";
      b.style.setProperty("--i", pos);
      b.innerHTML = `<span class="key">${pos + 1}</span>${LETTERS[pos]}: ${escapeHTML(it.q.options[origIdx])}`;
      b.addEventListener("click", () => pick(pos));
      box.appendChild(b);
    });
    paintOptions(false);

    [...$("#qList").children].forEach((_, i) => listState(i));
    $("#qList").children[s.idx].scrollIntoView({ block: "nearest", inline: "nearest" });
    $("#prevBtn").disabled = s.idx === 0;
    $("#nextBtn").disabled = s.idx === s.items.length - 1;
    $("#nextBtn").classList.toggle("nudge", isLocked && s.mode === "lesson" && s.idx < s.items.length - 1);
    $("#revealBtn").disabled = isLocked;
  }

  /** Tô màu phương án theo trạng thái câu hiện tại. */
  function paintOptions(animate) {
    const it = session.items[session.idx];
    const btns = [...$("#options").children];
    const mode = session.mode;
    const show = mode === "review" || (mode === "lesson" && (it.picked != null || it.revealed));
    btns.forEach((b, pos) => {
      b.classList.remove("picked", "correct", "wrong", "hint", "dim");
      b.querySelector(".mark")?.remove();
      if (!animate) b.style.animationDelay = "";
      if (mode === "exam") {
        if (pos === it.picked) b.classList.add("picked");
        return;
      }
      b.disabled = show;
      if (!show) return;
      if (pos === it.answerPos) {
        b.classList.add(it.picked === pos ? "correct" : it.picked == null && mode === "lesson" ? "hint" : "correct");
        if (it.picked === pos) addMark(b, "✔", "#0c7a24");
      } else if (pos === it.picked) {
        b.classList.add("wrong");
        addMark(b, "✖", "#c20000");
      } else b.classList.add("dim");
      if (animate) b.style.animationDelay = "0s";
    });
  }

  function addMark(btn, ch, color) {
    const m = document.createElement("span");
    m.className = "mark";
    m.textContent = ch;
    m.style.color = color;
    btn.appendChild(m);
  }

  function pick(pos) {
    const s = session;
    if (!s || s.finished && s.mode !== "review") return;
    const it = s.items[s.idx];
    if (s.mode === "review") return;

    if (s.mode === "exam") {
      it.picked = it.picked === pos ? null : pos;
      audio.sfx.pick();
      paintOptions(true);
      listState(s.idx);
      updateProgress();
      return;
    }

    // Luyện tập: chấm ngay
    if (it.picked != null || it.revealed) return;
    it.picked = pos;
    const btn = $("#options").children[pos];
    if (pos === it.answerPos) {
      s.correct++;
      audio.sfx.correct();
      fx.fromEl(btn, 50);
      const sn = $("#scoreNum");
      sn.textContent = s.correct;
      sn.classList.remove("bump");
      void sn.offsetWidth;
      sn.classList.add("bump");
      toast(["Chính xác! 🎉", "Tuyệt vời! ⭐", "Giỏi quá! 👏", "Đúng rồi! 💪"][(Math.random() * 4) | 0], "good");
    } else {
      audio.sfx.wrong();
      toast(`Chưa đúng – đáp án là ${LETTERS[it.answerPos]}`, "bad");
    }
    paintOptions(true);
    listState(s.idx);
    $("#revealBtn").disabled = true;
    $("#nextBtn").classList.toggle("nudge", s.idx < s.items.length - 1);
    updateProgress();
    checkLessonDone();
  }

  function reveal() {
    const s = session;
    if (!s || s.mode !== "lesson") return;
    const it = s.items[s.idx];
    if (it.picked != null || it.revealed) return;
    it.revealed = true;
    audio.sfx.reveal();
    paintOptions(true);
    listState(s.idx);
    $("#revealBtn").disabled = true;
    $("#nextBtn").classList.toggle("nudge", s.idx < s.items.length - 1);
    updateProgress();
    checkLessonDone();
  }

  function checkLessonDone() {
    const s = session;
    if (s.items.every((it) => it.picked != null || it.revealed)) {
      setTimeout(() => session === s && !s.finished && finish("done"), 1100);
    }
  }

  function goTo(i) {
    if (!session || i < 0 || i >= session.items.length || i === session.idx) return;
    const dir = i > session.idx ? 1 : -1;
    session.idx = i;
    renderQuestion(dir);
  }
  const go = (d) => { if (session) { audio.sfx.tick(); goTo(session.idx + d); } };

  function updateProgress() {
    const s = session;
    const bar = $("#progressBar");
    if (s.mode === "exam" && !s.finished) return; // thanh thời gian do bộ đếm cập nhật
    const done = s.items.filter((it) => it.picked != null || it.revealed).length;
    bar.classList.remove("warn");
    bar.style.width = (done / s.items.length) * 100 + "%";
  }

  /* ---------- Bộ đếm giờ ---------- */
  function startTimer() {
    stopTimer();
    const total = session.minutes * 60;
    const tick = () => {
      const left = Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
      $("#timerText").textContent = fmtTime(left);
      const warn = left <= 60;
      $("#timerBox").classList.toggle("warn", warn);
      const bar = $("#progressBar");
      bar.style.width = (left / total) * 100 + "%";
      bar.classList.toggle("warn", warn);
      if (warn && left > 0 && left <= 10) audio.sfx.tick();
      if (left <= 0) timeUp();
    };
    tick();
    timerId = setInterval(tick, 1000);
  }
  function stopTimer() { clearInterval(timerId); timerId = null; }

  function timeUp() {
    stopTimer();
    if (!session || session.finished) return;
    modal.close();
    session.finished = true;
    setTitle(`${module.name} · Hết giờ`);
    show("timeout");
    audio.sfx.bell();
    audio.playJingle();
    const s = session;
    setTimeout(() => session === s && finish("timeout"), 3800);
  }

  function confirmSubmit() {
    const s = session;
    const blank = s.items.filter((it) => it.picked == null).length;
    modal.open(
      "Nộp bài?",
      blank ? `<p>Bạn còn <b>${blank}</b> câu chưa trả lời. Vẫn nộp bài?</p>` : "<p>Bạn đã trả lời tất cả câu hỏi. Nộp bài ngay?</p>",
      [
        { label: "Làm tiếp", cls: "ghost" },
        { label: "Nộp bài", cls: "danger", onClick: () => { modal.close(); finish("submit"); } },
      ],
    );
  }

  /* ---------- Kết thúc & kết quả ---------- */
  function finish(reason) {
    const s = session;
    stopTimer();
    s.finished = true;
    s.usedSec = Math.round((Date.now() - s.startedAt) / 1000);
    if (s.mode === "exam") s.usedSec = Math.min(s.usedSec, s.minutes * 60);
    if (s.mode === "exam") {
      s.correct = s.items.filter((it) => it.picked === it.answerPos).length;
      if (reason === "submit") audio.playJingle();
    }
    const total = s.items.length;
    const score = Math.round((s.correct / total) * 100) / 10;
    s.score = score;

    const key = progressKey(module, s.lesson, s.set);
    const prev = progress[key];
    if (!prev || score > prev.best) {
      progress[key] = { best: score, correct: s.correct, total, at: Date.now() };
      store.set("progress", progress);
    }
    showResult(prev && score > prev.best);
  }

  function showResult(newRecord) {
    const s = session;
    const total = s.items.length;
    const wrong = s.items.filter((it) => it.picked != null && it.picked !== it.answerPos).length;
    const skip = total - s.correct - wrong;
    const stars = s.score >= 9 ? 3 : s.score >= 7 ? 2 : s.score >= 5 ? 1 : 0;

    setTitle(`${module.name} · ${s.lesson.name} · Kết quả`);
    $("#resultStars").innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? "on" : ""}">⭐</span>`).join("");
    $("#resultTitle").textContent = s.mode === "exam" ? "Kết quả thi thử" : `Hoàn thành ${s.lesson.name}!`;
    $("#statCorrect").textContent = s.correct;
    $("#statWrong").textContent = wrong;
    $("#statSkip").textContent = skip;
    $("#statTime").textContent = fmtTime(s.usedSec);
    $("#resultMsg").textContent =
      (newRecord ? "🏆 Kỷ lục mới! " : "") +
      (stars === 3 ? "Xuất sắc! Bạn nắm bài rất vững." :
        stars === 2 ? "Khá lắm! Ôn thêm chút nữa là hoàn hảo." :
          stars === 1 ? "Đạt yêu cầu – cố gắng hơn nhé!" : "Đừng nản, xem lại bài và thử lại nào!");

    const ring = $("#ringFg");
    const C = 2 * Math.PI * 52;
    ring.style.transition = "none";
    ring.style.strokeDashoffset = C;
    ring.style.stroke = s.score >= 5 ? "var(--green)" : "#d10000";
    const num = $("#resultScore");
    num.textContent = "0";
    show("result");

    requestAnimationFrame(() => requestAnimationFrame(() => {
      ring.style.transition = "";
      ring.style.strokeDashoffset = C * (1 - s.score / 10);
    }));
    const t0 = performance.now();
    const count = (t) => {
      const k = Math.min(1, (t - t0) / 1400);
      num.textContent = (s.score * (1 - Math.pow(1 - k, 3))).toFixed(k < 1 ? 1 : (s.score % 1 ? 1 : 0));
      if (k < 1) requestAnimationFrame(count);
    };
    requestAnimationFrame(count);

    if (stars >= 2) setTimeout(() => { fx.celebrate(); if (s.mode !== "exam") audio.sfx.fanfare(); }, 500);
    else if (s.mode !== "exam") audio.sfx.reveal();
  }

  function review() {
    const s = session;
    s.mode = "review";
    s.idx = 0;
    $("#screen-quiz").dataset.mode = "review";
    $("#qMode").textContent = "Xem lại";
    $("#qMode").classList.remove("exam");
    $("#scoreNum").textContent = s.correct;
    setTitle(`${module.name} · ${s.lesson.name} · Xem lại`);
    updateProgress();
    renderQuestion(1);
    show("quiz");
  }

  function retry() {
    const s = session;
    const mode = s.lesson.type === "exam" ? "exam" : "lesson";
    if (mode === "exam") examSetup(s.lesson, s.set);
    else startSession({ mode, lesson: s.lesson, set: s.set });
  }

  /* ===================== ĐIỀU HƯỚNG ===================== */
  function back() {
    if (modal.isOpen) return modal.close();
    audio.sfx.click();
    switch (currentScreen) {
      case "quiz":
        if (session && session.mode === "exam" && !session.finished) {
          modal.open("Thoát bài thi?", "<p>Bài làm hiện tại sẽ không được lưu.</p>", [
            { label: "Ở lại", cls: "ghost" },
            { label: "Thoát", cls: "danger", onClick: () => { modal.close(); openModule(DATA.modules.indexOf(module)); } },
          ]);
        } else if (session && session.mode === "review") show("result");
        else openModule(DATA.modules.indexOf(module));
        break;
      case "result":
      case "timeout":
        openModule(DATA.modules.indexOf(module));
        break;
      case "module":
        goHome();
        break;
    }
  }

  /* ===================== SỰ KIỆN ===================== */
  $("#backBtn").addEventListener("click", back);
  document.querySelector("[data-action=home]").addEventListener("click", (e) => {
    e.preventDefault();
    if (currentScreen === "quiz" && session?.mode === "exam" && !session.finished) return back();
    goHome();
  });
  $("#prevBtn").addEventListener("click", () => go(-1));
  $("#nextBtn").addEventListener("click", () => go(1));
  $("#revealBtn").addEventListener("click", reveal);
  $("#submitBtn").addEventListener("click", confirmSubmit);
  $("#reviewBtn").addEventListener("click", () => { audio.sfx.click(); review(); });
  $("#retryBtn").addEventListener("click", () => { audio.sfx.click(); retry(); });
  $("#toModuleBtn").addEventListener("click", () => { audio.sfx.click(); openModule(DATA.modules.indexOf(module)); });

  // Âm lượng + nhạc nền
  const vol = $("#volume");
  const volBtn = $("#volBtn");
  let lastVol = audio.volume || 0.5;
  const paintVol = () => {
    vol.value = Math.round(audio.volume * 100);
    volBtn.classList.toggle("muted", audio.volume === 0);
    volBtn.classList.toggle("low", audio.volume > 0 && audio.volume < 0.4);
    vol.style.background = "";
  };
  vol.addEventListener("input", () => { audio.setVolume(vol.value / 100); paintVol(); });
  vol.addEventListener("change", () => audio.sfx.tick());
  volBtn.addEventListener("click", () => {
    if (audio.volume > 0) { lastVol = audio.volume; audio.setVolume(0); }
    else { audio.setVolume(lastVol || 0.5); audio.sfx.tick(); }
    paintVol();
  });
  paintVol();

  const musicBtn = $("#musicBtn");
  musicBtn.classList.toggle("off", !audio.musicOn);
  musicBtn.addEventListener("click", () => {
    const on = audio.toggleMusic();
    musicBtn.classList.toggle("off", !on);
    toast(on ? "🎵 Đã bật nhạc nền" : "🔇 Đã tắt nhạc nền");
  });

  // Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên của người dùng
  ["pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => audio.unlock(), { once: true }));

  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "Escape") return back();
    if (modal.isOpen) return;
    if (e.key.toLowerCase() === "m") return musicBtn.click();
    if (currentScreen !== "quiz" || !session) return;
    const k = e.key.toUpperCase();
    const n = LETTERS.indexOf(k) >= 0 && k.length === 1 ? LETTERS.indexOf(k) : parseInt(e.key, 10) - 1;
    if (n >= 0 && n < session.items[session.idx].order.length) { e.preventDefault(); return pick(n); }
    if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === " " && session.mode === "lesson") { e.preventDefault(); reveal(); }
  });

  // Vuốt trái/phải trên điện thoại để chuyển câu
  // (bỏ qua khi vuốt trên thanh danh sách câu / thanh âm lượng, hoặc khi đang cuộn dọc)
  let touchStart = null;
  $("#screen-quiz").addEventListener("touchstart", (e) => {
    touchStart = e.target.closest("#qList, input") ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  $("#screen-quiz").addEventListener("touchend", (e) => {
    if (touchStart == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  });

  goHome();
})();

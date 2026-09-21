(() => {
  if (window.__arpMobileFollowLoadedV2) return;
  window.__arpMobileFollowLoadedV2 = true;

  const mq = window.matchMedia("(max-width: 720px)");
  const mobile = document.querySelector("#mobileTopology");
  if (!mobile) return;

  let autoFollow = localStorage.getItem("arpMobileAutoFollow") !== "off";
  let userPauseUntil = 0;
  let pauseTimer = null;
  let lastTarget = null;
  let lastFocusAt = 0;
  let replyTimers = [];
  let observerTimer = null;
  let programmaticUntil = 0;

  const head = mobile.querySelector(".mt-head");
  const control = document.createElement("div");
  control.className = "mobile-follow-control";
  control.innerHTML = `
    <div class="mobile-follow-left">
      <i class="mobile-follow-dot"></i>
      <div class="mobile-follow-text">
        <b>패킷 따라가기</b>
        <span id="mobileFollowStatus">자동 이동 ON</span>
      </div>
    </div>
    <button type="button" class="mobile-follow-toggle" id="mobileFollowToggle">ON</button>`;
  if (head) head.insertAdjacentElement("afterend", control);

  const status = control.querySelector("#mobileFollowStatus");
  const toggle = control.querySelector("#mobileFollowToggle");
  const eventTitle = document.querySelector("#liveEventTitle") || document.querySelector("#mtEventTitle");
  const eventDetail = document.querySelector("#liveEventDetail") || document.querySelector("#mtEventDetail");
  const liveStrip = document.querySelector("#liveEventStrip");
  const pingBtn = document.querySelector("#pingBtn");

  function clearReplyTimers() {
    replyTimers.forEach(clearTimeout);
    replyTimers = [];
  }

  function setControlState(message) {
    const paused = autoFollow && Date.now() < userPauseUntil;
    control.classList.toggle("off", !autoFollow);
    control.classList.toggle("paused", paused);
    toggle.textContent = autoFollow ? "ON" : "OFF";
    status.textContent = message ||
      (!autoFollow ? "자동 이동 꺼짐" :
       paused ? "수동 스크롤 감지 · 잠시 멈춤" :
       "자동 이동 ON");
  }

  function pauseForUser() {
    if (!mq.matches || !autoFollow || !state.busy) return;
    if (Date.now() < programmaticUntil) return;
    userPauseUntil = Date.now() + 2600;
    setControlState();
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      if (!autoFollow) return;
      userPauseUntil = 0;
      setControlState("다음 패킷부터 자동 추적");
    }, 2650);
  }

  window.addEventListener("touchmove", pauseForUser, { passive: true });
  window.addEventListener("wheel", pauseForUser, { passive: true });

  toggle.addEventListener("click", () => {
    autoFollow = !autoFollow;
    localStorage.setItem("arpMobileAutoFollow", autoFollow ? "on" : "off");
    userPauseUntil = 0;
    clearReplyTimers();
    setControlState(autoFollow ? "자동 이동 ON" : "화면을 자유롭게 이동할 수 있습니다");
    if (autoFollow) handleDomEvent(true);
  });

  function flash(el) {
    if (!el) return;
    el.classList.remove("mobile-follow-focus");
    void el.offsetWidth;
    el.classList.add("mobile-follow-focus");
    setTimeout(() => el.classList.remove("mobile-follow-focus"), 800);
  }

  function visibleEnough(el) {
    const r = el.getBoundingClientRect();
    const topSafe = 118;
    const bottomSafe = window.innerHeight - 122;
    return r.top >= topSafe && r.bottom <= bottomSafe;
  }

  function scrollToElement(el, { force = false, label = "" } = {}) {
    if (!mq.matches || !autoFollow || !el) return false;
    if (document.body.classList.contains("mobile-sheet-open")) return false;
    if (!force && Date.now() < userPauseUntil) return false;

    const now = Date.now();
    if (!force && el === lastTarget && now - lastFocusAt < 420) {
      if (label) setControlState(label);
      return false;
    }
    lastTarget = el;
    lastFocusAt = now;

    if (!force && visibleEnough(el)) {
      flash(el);
      if (label) setControlState(label);
      return true;
    }

    const r = el.getBoundingClientRect();
    const absoluteCenter = window.scrollY + r.top + r.height / 2;
    const targetTop = Math.max(0, absoluteCenter - window.innerHeight * 0.43);

    programmaticUntil = Date.now() + 900;
    window.scrollTo({ top: targetTop, behavior: "smooth" });
    flash(el);
    if (label) setControlState(label);
    return true;
  }

  function scrollToRegion(selectors, opts = {}) {
    const els = selectors.map(s => mobile.querySelector(s)).filter(Boolean);
    if (!els.length) return false;
    if (els.length === 1) return scrollToElement(els[0], opts);
    if (!opts.force && Date.now() < userPauseUntil) return false;

    const rects = els.map(el => el.getBoundingClientRect());
    const top = Math.min(...rects.map(r => r.top));
    const bottom = Math.max(...rects.map(r => r.bottom));
    const topSafe = 118;
    const bottomSafe = window.innerHeight - 122;

    if (!opts.force && top >= topSafe && bottom <= bottomSafe) {
      flash(els[els.length - 1]);
      if (opts.label) setControlState(opts.label);
      return true;
    }

    const absoluteCenter = window.scrollY + (top + bottom) / 2;
    programmaticUntil = Date.now() + 900;
    window.scrollTo({
      top: Math.max(0, absoluteCenter - window.innerHeight * 0.43),
      behavior: "smooth"
    });
    flash(els[els.length - 1]);
    if (opts.label) setControlState(opts.label);
    return true;
  }

  function inferKind() {
    if (!liveStrip) return "";
    const classes = ["error", "reply", "icmp", "arp", "route"];
    return classes.find(c => liveStrip.classList.contains(c)) || "ready";
  }

  function scheduleReplyPath(kind, title) {
    clearReplyTimers();
    if (!autoFollow || !mq.matches || kind !== "reply") return;

    if (title.startsWith("PC2 → R2")) {
      return scrollToRegion(["#mtPc2", "#mtR2"], { force: true, label: title.includes("ARP Reply") ? "ARP Reply · PC2 → R2" : "Echo Reply · PC2 → R2" });
    }
    if (title.startsWith("PC3 → R2")) {
      return scrollToRegion(["#mtPc3", "#mtR2"], { force: true, label: title.includes("ARP Reply") ? "ARP Reply · PC3 → R2" : "Echo Reply · PC3 → R2" });
    }
    if (title.startsWith("PC3 → PC1")) {
      return scrollToRegion(["#mtPc3", "#mtPc1"], { force: true, label: title.includes("ARP Reply") ? "ARP Reply · PC3 → PC1" : "Echo Reply · PC3 → PC1" });
    }
    if (title.startsWith("R2") && title.includes("→ PC1")) {
      return scrollToRegion(["#mtR2", "#mtPc1"], { force: true, label: title.includes("ARP Reply") ? "ARP Reply · R2 → PC1" : "Echo Reply · R2 → PC1" });
    }
    if (title.startsWith("R2") && title.includes("→ PC2")) {
      return scrollToRegion(["#mtR2", "#mtPc2"], { force: true, label: "ARP Reply · R2 → PC2" });
    }
    if (title.startsWith("R2") && title.includes("→ PC3")) {
      return scrollToRegion(["#mtR2", "#mtPc3"], { force: true, label: "ARP Reply · R2 → PC3" });
    }
  }

  function focusError(title, detail) {
    const combined = `${title} ${detail}`;
    const pairs = [
      ["PC1↔SW1", "pc1sw1"],
      ["SW1↔PC3", "sw1pc3"],
      ["SW1↔R2", "sw1r2"],
      ["R2↔SW2", "r2sw2"],
      ["SW2↔PC2", "sw2pc2"]
    ];
    for (const [label, key] of pairs) {
      if (combined.includes(label)) {
        return scrollToElement(
          mobile.querySelector(`[data-m-link="${key}"]`),
          { force: true, label: `장애 · ${label}` }
        );
      }
    }
    if (combined.includes("PC2")) {
      return scrollToElement(mobile.querySelector("#mtPc2"), { force: true, label: "장애 · PC2" });
    }
    if (combined.includes("R2") || combined.includes("Gateway")) {
      return scrollToElement(mobile.querySelector("#mtR2"), { force: true, label: "장애 · R2" });
    }
    return scrollToElement(mobile.querySelector("#mtPc1"), { force: true, label: "장애 원인 확인" });
  }

  function handleDomEvent(force = false) {
    if (!mq.matches || !autoFollow) return;
    const title = eventTitle?.textContent?.trim() || "";
    const detail = eventDetail?.textContent?.trim() || "";
    const kind = inferKind();

    window.__arpLastMobileEvent = { kind, title, detail };

    if (!title || title.includes("대기")) return;
    if (kind === "error") return focusError(title, detail);

    if (kind === "reply") {
      scheduleReplyPath(kind, title);
      return;
    }

    clearReplyTimers();

    if (title.includes("목적지 네트워크 판단")) {
      return scrollToElement(mobile.querySelector("#mtPc1"), { force, label: "판단 중 · PC1" });
    }
    if (title.includes("SW1 · ARP")) {
      return scrollToElement(mobile.querySelector("#mtSw1"), { force, label: "ARP Broadcast · SW1" });
    }
    if (title.includes("PC1 → PC3")) {
      return scrollToRegion(["#mtSw1", "#mtPc3"], { force, label: "ICMP · PC3 방향" });
    }
    if (title.includes("PC1 → R2")) {
      return scrollToElement(mobile.querySelector("#mtR2"), { force, label: "ICMP · R2 도착" });
    }
    if (title.includes("R2 · Route Lookup")) {
      return scrollToElement(mobile.querySelector("#mtR2"), { force, label: "Route Lookup · R2" });
    }
    if (title.includes("R2 → PC2")) {
      return scrollToRegion(["#mtSw2", "#mtPc2"], { force, label: "ICMP · PC2 방향" });
    }
    if (title.includes("R2 → PC3")) {
      return scrollToRegion(["#mtSw1", "#mtPc3"], { force, label: "ICMP · PC3 방향" });
    }

    const errorNode = mobile.querySelector(".error-active");
    if (errorNode) return scrollToElement(errorNode, { force: true, label: "장애 위치" });

    const activeNodes = [...mobile.querySelectorAll(".mt-device.active,.mt-switch.active,.mt-link.active")];
    if (activeNodes.length) {
      return scrollToElement(activeNodes[activeNodes.length - 1], {
        force,
        label: "현재 패킷 위치"
      });
    }
  }

  function queueDomEvent(force = false) {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => handleDomEvent(force), 40);
  }

  if (eventTitle || eventDetail || liveStrip) {
    const eventObserver = new MutationObserver(() => queueDomEvent(false));
    if (eventTitle) eventObserver.observe(eventTitle, { childList: true, characterData: true, subtree: true });
    if (eventDetail) eventObserver.observe(eventDetail, { childList: true, characterData: true, subtree: true });
    if (liveStrip) eventObserver.observe(liveStrip, { attributes: true, attributeFilter: ["class"] });
  }

  const topologyObserver = new MutationObserver(() => {
    if (!state.busy || !autoFollow || Date.now() < userPauseUntil) return;
    queueDomEvent(false);
  });
  topologyObserver.observe(mobile, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true
  });

  if (pingBtn) {
    pingBtn.addEventListener("click", () => {
      if (!mq.matches || !autoFollow) return;
      userPauseUntil = 0;
      clearReplyTimers();
      setControlState("PING 시작 · PC1");
      setTimeout(() => {
        scrollToElement(mobile.querySelector("#mtPc1"), { force: true, label: "PING 시작 · PC1" });
      }, 20);
    }, true);
  }

  if (typeof showPacketStop === "function") {
    const baseStop = showPacketStop;
    showPacketStop = function(key, reason = "") {
      const result = baseStop(key, reason);
      const map = {
        pc1sw1: "[data-m-link='pc1sw1']",
        sw1pc3: "[data-m-link='sw1pc3']",
        sw1r2: "[data-m-link='sw1r2']",
        r2sw2: "[data-m-link='r2sw2']",
        sw2pc2: "[data-m-link='sw2pc2']"
      };
      setTimeout(() => {
        scrollToElement(mobile.querySelector(map[key]), {
          force: true,
          label: `장애 지점 · ${reason || "LINK DOWN"}`
        });
      }, 20);
      return result;
    };
  }

  window.__arpSmartFollowFocus = () => handleDomEvent(true);
  mq.addEventListener?.("change", () => {
    if (!mq.matches) clearReplyTimers();
    setControlState();
  });
  setControlState();
})();
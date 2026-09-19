/* 雨滴·手记 —— 全站脚本
   主题切换 / 花瓣 / 抽屉菜单 / 搜索框 / 目录 / 无限滚动 / 搜索页 */

(function () {
  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ── 主题切换 ───────────────────────────── */
  var STORE_KEY = "yudi-theme";
  var root = document.documentElement;
  var themeBtn = document.getElementById("themeToggle");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeBtn) {
      themeBtn.textContent = theme === "dark" ? "☀" : "☾";
    }
  }

  applyTheme(currentTheme());

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORE_KEY, next);
    });
  }

  /* ── 导航高亮当前页（分类 / 归档等） ────── */
  (function () {
    var links = document.querySelectorAll(
      "nav.desktop-nav a, .mobile-drawer nav a",
    );
    if (!links.length) return;

    var path = location.pathname.replace(/\/+$/, "") || "/";

    // 文章详情的地址是 /archives/{slug}，不含所属分类，按路径匹配只会落到「归档」。
    // 这里改读页面上渲染出的分类徽标，用分类名去命中对应的导航项。
    var badge = document.querySelector(".article-header .badge");
    var activeText =
      badge && path.indexOf("/archives/") === 0 ? badge.textContent.trim() : "";

    Array.prototype.forEach.call(links, function (link) {
      var href = (link.getAttribute("href") || "").replace(/\/+$/, "");
      if (!href) return;

      if (activeText) {
        if (link.textContent.trim() === activeText) {
          link.classList.add("active");
        }
        return;
      }

      if (href === path) {
        link.classList.add("active");
      }
    });
  })();

  /* ── 登录后回到来源页 ─────────────────────
     Halo 登录成功后默认把用户送去个人中心。这里给登录链接带上官方支持的
     redirect_uri，并在登录页把该参数一并提交，让访客登录完回到博客页面。 */
  (function () {
    var redirect = new URLSearchParams(location.search).get("redirect_uri");

    // 登录页：把 redirect_uri 随表单一起提交，登录成功后回跳
    var loginForm = document.getElementById("login-form");
    if (loginForm && redirect && !loginForm.querySelector('input[name="redirect_uri"]')) {
      var hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "redirect_uri";
      hidden.value = redirect;
      loginForm.appendChild(hidden);
    }

    // 其余页面：把登录入口指向当前页
    if (redirect || location.pathname.indexOf("/login") === 0) return;

    var back = location.pathname + location.search + location.hash;
    Array.prototype.forEach.call(document.querySelectorAll('a[href="/login"]'), function (link) {
      link.href = "/login?redirect_uri=" + encodeURIComponent(back);
    });
  })();

  /* ── 移动端导航抽屉（右侧滑出 + 遮罩） ──────
     与文章页目录抽屉同一套交互：点遮罩 / 点 ✕ / 按 Esc / 点菜单项都会关闭，
     展开时锁住背景滚动，拉宽回桌面时自动收起（否则会残留 overflow: hidden）。 */
  (function () {
    var hamburger = document.getElementById("hamburgerBtn");
    var drawer = document.getElementById("mobileDrawer");
    if (!hamburger || !drawer) return;

    var drawerClose = document.getElementById("drawerClose");
    var scrim = document.createElement("div");
    scrim.className = "drawer-scrim";
    document.body.appendChild(scrim);

    function openDrawer() {
      drawer.classList.add("open");
      scrim.classList.add("open");
      document.body.style.overflow = "hidden";
      hamburger.setAttribute("aria-expanded", "true");
    }

    function closeDrawer() {
      if (!drawer.classList.contains("open")) return;
      drawer.classList.remove("open");
      scrim.classList.remove("open");
      document.body.style.overflow = "";
      hamburger.setAttribute("aria-expanded", "false");
    }

    hamburger.addEventListener("click", openDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
    scrim.addEventListener("click", closeDrawer);
    drawer.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("nav a")) closeDrawer();
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) closeDrawer();
    });
  })();

  /* ── 搜索框展开 ─────────────────────────── */
  var searchToggle = document.getElementById("searchToggle");
  var searchBox = document.getElementById("searchBox");

  if (searchToggle && searchBox) {
    searchToggle.addEventListener("click", function () {
      searchBox.classList.toggle("open");
      if (searchBox.classList.contains("open")) {
        searchBox.querySelector("input").focus();
      }
    });
  }

  /* ── 北京时间（固定 Asia/Shanghai，逐秒刷新；点击切换 时间/日期/收起） ── */
  (function () {
    var el = document.getElementById("bjClock");
    var clock = document.querySelector(".brand-clock");
    if (!el || !clock) return;

    var timeFmt = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    var dateFmt = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    });

    function toMap(fmt, date) {
      var map = {};
      var parts = fmt.formatToParts(date);
      for (var i = 0; i < parts.length; i++) map[parts[i].type] = parts[i].value;
      return map;
    }

    var mode = "time"; // time → date → hidden → time

    function paint(now) {
      var d = toMap(dateFmt, now);
      el.title = d.year + "-" + d.month + "-" + d.day + " " + d.weekday;

      if (mode === "time") {
        var t = toMap(timeFmt, now);
        el.textContent = t.hour + ":" + t.minute + ":" + t.second;
      } else if (mode === "date") {
        el.textContent = d.year + "-" + d.month + "-" + d.day;
      }
    }

    function tick() {
      var now = new Date();
      if (mode === "time") paint(now);
      // 对齐到下一个整秒，避免 setInterval 漂移
      setTimeout(tick, 1000 - (now.getTime() % 1000));
    }

    function cycle() {
      mode = mode === "time" ? "date" : mode === "date" ? "hidden" : "time";
      clock.classList.toggle("brand-clock--date", mode === "date");
      clock.classList.toggle("brand-clock--hidden", mode === "hidden");
      if (mode !== "hidden") paint(new Date());
    }

    clock.addEventListener("click", cycle);
    clock.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        cycle();
      }
    });

    paint(new Date());
    tick();
  })();

  /* ── 飘落花瓣 ───────────────────────────── */
  (function () {
    var field = document.getElementById("petalField");
    if (!field || reduceMotion) return;

    var NS = "http://www.w3.org/2000/svg";
    // 樱花花瓣轮廓：圆底、尖端带 V 形凹口
    var PETAL_PATH =
      "M5.2 14 C5.2 9.2 9 4.9 14.6 4.1 L16 6.4 L17.4 4.1 C23 4.9 26.8 9.2 26.8 14 C26.8 19 24.5 23.5 21 26.5 C19.4 27.8 17.8 28.9 16 29.8 C14.2 28.9 12.6 27.8 11 26.5 C7.5 23.5 5.2 19 5.2 14 Z";

    var mode = document.body.getAttribute("data-petals");
    var scope = document.getElementById("petalScope");
    var maxPetals = mode === "full" ? 14 : 8;
    var active = 0;
    var allowed = true;

    function spawn() {
      if (!allowed || active >= maxPetals) return;
      active++;

      var el = document.createElement("div");
      el.className = "petal";

      var size = 10 + Math.random() * 10;
      var fallDuration = 8 + Math.random() * 7;
      var swayDuration = 3 + Math.random() * 2;
      var depth = 0.4 + Math.random() * 0.6;

      el.style.left = Math.random() * 100 + "vw";
      el.style.width = size * depth + "px";
      el.style.height = size * depth + "px";
      el.style.animationDuration = fallDuration + "s, " + swayDuration + "s";
      el.style.filter = depth < 0.6 ? "blur(0.6px)" : "none";
      if (mode !== "full") {
        el.style.animationName = "petal-fall, petal-sway";
        el.style.animationIterationCount = "1, infinite";
      }

      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 32 32");
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", PETAL_PATH);
      svg.appendChild(path);
      el.appendChild(svg);

      field.appendChild(el);
      setTimeout(function () {
        el.remove();
        active--;
      }, fallDuration * 1000);
    }

    // 区域限定模式：只在头部可见时生成花瓣
    if (mode !== "full" && scope) {
      allowed = false;
      new IntersectionObserver(
        function (entries) {
          allowed = entries[0].isIntersecting;
        },
        { threshold: 0 },
      ).observe(scope);
    }

    for (var i = 0; i < 5; i++) setTimeout(spawn, i * 900);
    setInterval(spawn, 1700);
  })();

  /* ── 欢迎页：雨滴落海（写实版水花） ─────── */
  (function () {
    var sea = document.querySelector(".sea");
    var field = document.querySelector(".rain-field");
    if (!sea || !field || reduceMotion) return;

    // 落点深度按 .sea 实际高度的百分比计算，避免固定像素偏移让雨滴悬在浪尖上方
    var LANDING_RATIO = 0.48;

    var NS = "http://www.w3.org/2000/svg";
    // 经典水滴形状：尖头朝上、圆底
    var TEARDROP = "M8 0 C8 6 15 10.5 15 15 A7 7 0 1 1 1 15 C1 10.5 8 6 8 0 Z";

    // 雨滴层（.rain-field）坐标：相对 body 顶部
    function landingY() {
      return sea.offsetTop + sea.offsetHeight * LANDING_RATIO;
    }

    // 水花元素（.sea 内部）坐标：相对 .sea 顶部
    function splashY() {
      return sea.offsetHeight * LANDING_RATIO;
    }

    function splash(x, y) {
      var ring = document.createElement("span");
      ring.className = "rain-ring";
      ring.style.left = x + "px";
      ring.style.top = y + "px";
      sea.appendChild(ring);
      ring
        .animate(
          [
            { transform: "translate(-50%, -50%) scale(0.12)", opacity: 0.5 },
            { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
          ],
          { duration: 520, easing: "ease-out" },
        )
        .onfinish = function () {
          ring.remove();
        };

      var count = 5 + Math.floor(Math.random() * 2); // 5-6 颗飞溅水珠
      for (var i = 0; i < count; i++) {
        var droplet = document.createElement("span");
        droplet.className = "rain-splash";
        droplet.style.left = x + "px";
        droplet.style.top = y + "px";
        sea.appendChild(droplet);

        // 扇形向上飞溅后受重力下坠、缩小淡出
        var angle =
          (-150 + (120 / (count - 1)) * i + (Math.random() * 24 - 12)) *
          (Math.PI / 180);
        var dist = 18 + Math.random() * 26;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist;
        droplet
          .animate(
            [
              { transform: "translate(-50%, -50%)", opacity: 0.85 },
              {
                transform:
                  "translate(calc(-50% + " +
                  dx * 0.6 +
                  "px), calc(-50% + " +
                  (dy * 0.6 - 6) +
                  "px))",
                opacity: 0.7,
                offset: 0.55,
              },
              {
                transform:
                  "translate(calc(-50% + " +
                  dx +
                  "px), calc(-50% + " +
                  (dy + 8) +
                  "px))",
                opacity: 0,
              },
            ],
            { duration: 420 + Math.random() * 120, easing: "ease-out" },
          )
          .onfinish = (function (el) {
            return function () {
              el.remove();
            };
          })(droplet);
      }
    }

    function rain(x) {
      var y = landingY();
      var drop = document.createElement("span");
      drop.className = "rain-drop";
      drop.style.left = x + "px";
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 16 22");
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", TEARDROP);
      svg.appendChild(path);
      drop.appendChild(svg);
      field.appendChild(drop);

      drop
        .animate(
          [
            { transform: "translateY(-16px)" },
            { transform: "translateY(" + y + "px)" },
          ],
          { duration: 650 + Math.random() * 150, easing: "cubic-bezier(0.45, 0, 1, 1)" },
        )
        .onfinish = function () {
          drop.remove();
          splash(x, splashY());
        };
    }

    // 每 0.65-1.05 秒一颗，与单颗 0.65-0.8 秒的下落时长接近，多数时候空中只有一颗、偶尔交叠；横向位置随机选槽 + 抖动，既均衡又不成固定顺序
    var SLOTS = 5;
    (function schedule() {
      setTimeout(function () {
        rain(
          document.documentElement.clientWidth *
            (0.08 +
              (0.84 / SLOTS) * Math.floor(Math.random() * SLOTS) +
              (Math.random() * 0.1 - 0.05)),
        );
        schedule();
      }, 650 + Math.random() * 400);
    })();
  })();

  /* ── 文章目录 ───────────────────────────── */
  (function () {
    var prose = document.querySelector(".prose");
    var sidebar = document.getElementById("tocSidebar");
    if (!prose || !sidebar) return;

    var headings = prose.querySelectorAll("h2, h3, h4, h5, h6");
    if (headings.length < 2) {
      sidebar.remove();
      var thinTrigger = document.getElementById("tocTrigger");
      if (thinTrigger) thinTrigger.remove();
      return;
    }

    // 按标题层级建树：任意级别的标题都能折叠它下面的内容
    var items = [];
    var stack = [];
    headings.forEach(function (heading, i) {
      if (!heading.id) {
        heading.id = "heading-" + i;
      }
      var level = parseInt(heading.tagName.slice(1), 10);
      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      var item = {
        id: heading.id,
        text: heading.textContent,
        level: level,
        parent: stack.length ? stack[stack.length - 1].id : "",
      };
      items.push(item);
      stack.push(item);
    });

    var childMap = {};
    items.forEach(function (item) {
      if (!item.parent) return;
      (childMap[item.parent] = childMap[item.parent] || []).push(item.id);
    });

    // 折叠一个标题时，它的所有后代（不限层级）一起隐藏
    function descendants(id) {
      var out = [];
      var queue = [id];
      while (queue.length) {
        (childMap[queue.shift()] || []).forEach(function (kid) {
          out.push(kid);
          queue.push(kid);
        });
      }
      return out;
    }

    function render(list) {
      list.innerHTML = "";

      items.forEach(function (item) {
        var li = document.createElement("li");
        li.setAttribute("data-id", item.id);
        if (item.level >= 3) li.className = "sub";

        var a = document.createElement("a");
        a.href = "#" + item.id;
        a.textContent = item.text;
        // 按层级缩进，每级 14px
        a.style.paddingLeft = 14 + (item.level - 2) * 14 + "px";
        li.appendChild(a);

        // 名下有内容的标题，右侧给一个收起 / 展开按钮
        if (childMap[item.id]) {
          li.classList.add("group");
          var toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "toc-toggle";
          toggle.title = "收起 / 展开子目录";
          toggle.setAttribute("aria-label", "收起 / 展开子目录");
          toggle.setAttribute("aria-expanded", "true");
          li.appendChild(toggle);
        }

        list.appendChild(li);
      });

      list.addEventListener("click", function (e) {
        var toggle = e.target.closest && e.target.closest(".toc-toggle");
        if (!toggle) return;
        e.preventDefault();

        var li = toggle.parentNode;
        var collapsed = li.classList.toggle("collapsed");
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");

        descendants(li.getAttribute("data-id")).forEach(function (id) {
          var el = list.querySelector('li[data-id="' + id + '"]');
          if (el) el.hidden = collapsed;
        });
      });
    }

    render(sidebar.querySelector("ul"));

    // 「本文目录」标签右侧的总控按钮：一键收起 / 展开全部
    (function () {
      var label = sidebar.querySelector(".toc-label");
      var list = sidebar.querySelector("ul");
      if (!label || !list || !items.length) return;

      var master = document.createElement("button");
      master.type = "button";
      master.className = "toc-toggle toc-toggle--all";
      master.title = "收起 / 展开全部";
      master.setAttribute("aria-label", "收起 / 展开全部");
      master.setAttribute("aria-expanded", "true");
      label.appendChild(master);

      master.addEventListener("click", function () {
        // 目录里还有可见条目就整体收起（连二级标题一起）；已经完全收起就全部展开
        var collapseAll = !!list.querySelector("li:not([hidden])");
        master.setAttribute("aria-expanded", collapseAll ? "false" : "true");

        Array.prototype.forEach.call(list.querySelectorAll("li"), function (li) {
          li.hidden = collapseAll;
          if (li.classList.contains("group")) {
            li.classList.toggle("collapsed", collapseAll);
          }
          var btn = li.querySelector(".toc-toggle");
          if (btn) btn.setAttribute("aria-expanded", collapseAll ? "false" : "true");
        });
      });
    })();

    // 桌面：侧栏吸附在视口垂直中间略偏上；内容超出视口时限制高度并允许内部滚动
    function centerSidebar() {
      // 窄屏是抽屉形态，位置完全交给 CSS，不能残留 inline style
      if (window.innerWidth <= 980) {
        sidebar.style.top = "";
        sidebar.style.maxHeight = "";
        return;
      }
      var contentH = sidebar.scrollHeight;
      if (!contentH) return;
      var top = Math.max(24, (window.innerHeight - contentH) / 2 - 56);
      sidebar.style.top = top + "px";
      sidebar.style.maxHeight = Math.max(160, window.innerHeight - top - 32) + "px";
    }
    centerSidebar();
    window.addEventListener("resize", centerSidebar);

    var links = document.querySelectorAll(".toc-sidebar a");

    function setActive(link) {
      links.forEach(function (l) {
        l.classList.remove("active");
      });
      link.classList.add("active");
    }

    // 按滚动位置判定当前章节：取最后一个已越过视口上方 25% 的标题。
    // 刚进文章、还没越过任何标题时落在第一个上，这样目录始终有一项高亮，
    // 不会出现"全都不亮"的空档（原来的 IntersectionObserver 就有这个空档）。
    var ticking = false;
    function updateActive() {
      ticking = false;
      var line = window.innerHeight * 0.25;
      var current = headings[0];
      headings.forEach(function (heading) {
        if (heading.getBoundingClientRect().top <= line) current = heading;
      });
      var link = sidebar.querySelector('a[href="#' + current.id + '"]');
      if (link && !link.classList.contains("active")) setActive(link);
    }
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateActive);
      },
      { passive: true },
    );
    updateActive();

    /* ── 窄屏：目录改为从右侧滑出的抽屉 ───────── */
    var trigger = document.getElementById("tocTrigger");
    var scrim = document.createElement("div");
    scrim.className = "toc-scrim";
    document.body.appendChild(scrim);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toc-close";
    closeBtn.setAttribute("aria-label", "关闭目录");
    sidebar.querySelector(".toc-label").appendChild(closeBtn);

    // 宽屏的「隐藏目录」：收起侧栏，把空间还给正文
    var collapseBtn = document.createElement("button");
    collapseBtn.type = "button";
    collapseBtn.className = "toc-collapse";
    collapseBtn.title = "隐藏目录";
    collapseBtn.setAttribute("aria-label", "隐藏目录");
    collapseBtn.setAttribute("aria-expanded", "true");
    sidebar.querySelector(".toc-label").appendChild(collapseBtn);

    // 正文顶部那个入口滚出视野后就够不着了，补一个滚动后浮现的悬浮入口
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "toc-fab";
    fab.setAttribute("aria-label", "打开文章目录");
    var fabIcon = document.createElement("span");
    fabIcon.className = "toc-fab-icon";
    fabIcon.setAttribute("aria-hidden", "true");
    fab.appendChild(fabIcon);
    fab.appendChild(document.createTextNode("目录"));
    document.body.appendChild(fab);

    function drawerMode() {
      return window.innerWidth <= 980;
    }

    function updateFab() {
      // 窄屏：滚过正文开头就浮出来；宽屏：只在目录被收起时才需要它
      var show =
        !sidebar.classList.contains("open") &&
        (drawerMode() ? window.scrollY > 320 : isTocHidden());
      fab.classList.toggle("show", show);
    }

    function openDrawer() {
      if (!drawerMode()) return;
      sidebar.classList.add("open");
      scrim.classList.add("open");
      // 抽屉展开时锁住正文滚动，避免背景跟着一起滑
      document.body.style.overflow = "hidden";
      if (trigger) trigger.setAttribute("aria-expanded", "true");
      closeBtn.focus();
      updateFab();
    }

    function closeDrawer() {
      if (!sidebar.classList.contains("open")) return;
      sidebar.classList.remove("open");
      scrim.classList.remove("open");
      document.body.style.overflow = "";
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      updateFab();
    }

    // 悬浮入口在窄屏负责开抽屉，在宽屏负责把收起的目录放回来
    fab.addEventListener("click", function () {
      if (drawerMode()) {
        openDrawer();
        return;
      }
      applyTocHidden(false);
      rememberTocHidden(false);
    });
    window.addEventListener("scroll", updateFab, { passive: true });
    updateFab();

    /* ── 宽屏：目录整体收起 / 放回 ──────────── */
    var articleShell = document.querySelector(".article-shell");
    var TOC_STORE_KEY = "yudi-toc-hidden";

    function isTocHidden() {
      return (
        !!articleShell && articleShell.classList.contains("article-shell--toc-hidden")
      );
    }

    function applyTocHidden(next) {
      if (!articleShell) return;
      articleShell.classList.toggle("article-shell--toc-hidden", next);
      collapseBtn.setAttribute("aria-expanded", next ? "false" : "true");
      updateFab();
    }

    function rememberTocHidden(next) {
      try {
        localStorage.setItem(TOC_STORE_KEY, next ? "1" : "0");
      } catch (e) {
        /* 隐私模式下写不进去，忽略即可 */
      }
    }

    collapseBtn.addEventListener("click", function () {
      var next = !isTocHidden();
      applyTocHidden(next);
      rememberTocHidden(next);
    });

    // 记住上次的选择，下次进文章页保持一致
    try {
      if (localStorage.getItem(TOC_STORE_KEY) === "1") applyTocHidden(true);
    } catch (e) {
      /* 读不到就当没收起 */
    }

    if (trigger) trigger.addEventListener("click", openDrawer);
    closeBtn.addEventListener("click", closeDrawer);
    scrim.addEventListener("click", closeDrawer);
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
    window.addEventListener("resize", function () {
      // 拉宽回桌面布局时清掉抽屉状态，否则会残留 overflow: hidden
      if (!drawerMode()) closeDrawer();
    });

    // 点击目录项立即高亮；窄屏顺手收起抽屉，方便马上看正文
    sidebar.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest(".toc-sidebar a") : null;
      if (!link) return;
      setActive(link);
      closeDrawer();
    });
  })();

  /* ── 无限滚动 ───────────────────────────── */
  (function () {
    var container = document.querySelector("[data-infinite]");
    if (!container) return;

    var sentinel = document.getElementById("infiniteSentinel");
    var status = document.getElementById("infiniteStatus");
    // 核心路由页面（分类 / 标签 / 归档）使用服务端给出的下一页地址；
    // 自定义落地页没有服务端分页，改为调用公开 API 拉取后续页。
    var api = container.getAttribute("data-api");
    var page = Number(container.getAttribute("data-page") || 1);
    var totalPages = Number(container.getAttribute("data-total-pages") || 1);
    var nextUrl = container.getAttribute("data-next-url") || "";
    var loading = false;

    function done() {
      status.textContent = "没有更多了";
      status.setAttribute("data-state", "done");
    }

    function isEnd() {
      return api ? page >= totalPages : !nextUrl;
    }

    if (isEnd()) done();

    function appendNodes(doc) {
      doc.querySelectorAll("[data-infinite] > *").forEach(function (node) {
        container.appendChild(node);
      });
    }

    function monthDay(value) {
      var date = new Date(value);
      if (isNaN(date.getTime())) return "";
      return (
        ("0" + (date.getMonth() + 1)).slice(-2) +
        "." +
        ("0" + date.getDate()).slice(-2)
      );
    }

    // 与服务端渲染的 post-card 结构保持一致，无封面时不渲染图片区域
    function createCard(post) {
      var card = document.createElement("a");
      card.className =
        "post-card" + (post.spec.cover ? "" : " post-card--text");
      card.href = post.status.permalink;

      if (post.spec.cover) {
        var img = document.createElement("img");
        img.className = "post-thumb";
        img.src = post.spec.cover;
        img.alt = "";
        img.loading = "lazy";
        card.appendChild(img);
      }

      var main = document.createElement("div");
      main.className = "post-main";

      var title = document.createElement("p");
      title.className = "post-title serif";
      title.textContent = post.spec.title;
      main.appendChild(title);

      var excerpt = document.createElement("p");
      excerpt.className = "post-excerpt";
      excerpt.textContent = post.status.excerpt || "";
      main.appendChild(excerpt);

      var sub = document.createElement("div");
      sub.className = "post-sub";
      var tags = document.createElement("div");
      tags.className = "post-tags";
      (post.tags || []).forEach(function (tag, index) {
        var pill = document.createElement("span");
        pill.className =
          index % 2 === 0
            ? "tag-pill tag-pill--pink"
            : "tag-pill tag-pill--blue";
        pill.textContent = tag.spec.displayName;
        tags.appendChild(pill);
      });
      sub.appendChild(tags);

      var date = document.createElement("span");
      date.className = "post-date";
      date.textContent = monthDay(post.spec.publishTime);
      sub.appendChild(date);

      main.appendChild(sub);
      card.appendChild(main);
      return card;
    }

    async function loadMore() {
      if (loading || isEnd()) return;
      loading = true;
      status.textContent = "正在加载";
      status.setAttribute("data-state", "loading");

      if (api) {
        var url =
          api +
          "?page=" +
          (page + 1) +
          "&size=" +
          (container.getAttribute("data-size") || 10) +
          "&sort=spec.publishTime,desc";
        var response = await fetch(url);
        var data = await response.json();
        (data.items || []).forEach(function (post) {
          container.appendChild(createCard(post));
        });
        page += 1;
        totalPages = data.totalPages || totalPages;
      } else {
        var html = await (await fetch(nextUrl)).text();
        var doc = new DOMParser().parseFromString(html, "text/html");
        appendNodes(doc);
        var next = doc.querySelector("[data-infinite]");
        nextUrl = next ? next.getAttribute("data-next-url") || "" : "";
      }

      if (isEnd()) {
        done();
      } else {
        status.textContent = "";
        status.setAttribute("data-state", "");
      }
      loading = false;
    }

    new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    ).observe(sentinel);
  })();

  /* ── 归档页：弧形年份轴 ─────────────────── */
  (function () {
    var arc = document.getElementById("arc");
    var axis = document.getElementById("arcAxis");
    if (!arc || !axis) return;

    var source = document.getElementById("arcSource");
    var svg = document.getElementById("arcSvg");
    var monthsEl = document.getElementById("arcMonths");
    var postsEl = document.getElementById("arcPosts");

    // 服务端渲染的扁平文章列表（#arcSource）→ 年 → 月 → 文章
    var years = [];
    var byYear = {};
    source.querySelectorAll("a").forEach(function (link) {
      var year = link.getAttribute("data-year");
      var month = link.getAttribute("data-month");
      if (!year || !month) return;
      if (!byYear[year]) {
        byYear[year] = { months: [], byMonth: {} };
        years.push(year);
      }
      var group = byYear[year];
      if (!group.byMonth[month]) {
        group.byMonth[month] = [];
        group.months.push(month);
      }
      group.byMonth[month].push({
        title: link.textContent,
        url: link.getAttribute("href"),
      });
    });
    if (!years.length) return;

    years.sort().reverse();
    years.forEach(function (year) {
      byYear[year].months.sort().reverse();
    });

    var N = years.length;
    var narrow = window.innerWidth <= 760;
    var R = narrow ? 95 : 180; // 弧半径：移动端加大，让弧的上下端点更舒展
    var H = narrow ? 480 : 620; // 轴高度
    var yearFont = narrow ? [14, 20] : [18, 28]; // 年份字号：[常规, 选中]
    var colPad = narrow ? 46 : 70; // 第一列在弧半径之外的余量
    var CY = H / 2;
    var SPAN = 110; // 年份在弧上的分布角度
    var step = N > 1 ? SPAN / (N - 1) : 0;
    // 夹紧范围必须覆盖"让首尾年份居中"所需的 ±SPAN/2，否则首尾年份转不到中心
    var MARGIN = SPAN / 2 + step * 0.5;

    var columns = arc.querySelectorAll(".arc-col");
    axis.style.height = H + "px";
    columns.forEach(function (column) {
      column.style.height = H + "px";
    });
    svg.setAttribute("width", R + 40);
    svg.setAttribute("height", H);
    // 第一列宽度与半径挂钩：中心处年份 x ≈ R，激活态放大后再留出字宽余量
    document.documentElement.style.setProperty(
      "--arc-col-w",
      Math.ceil(R + colPad) + "px",
    );

    var rotation = 0;
    var activeIndex = 0;
    var items = [];

    function drawTrack() {
      var total = SPAN + 2 * (step * 0.5 + 10);
      var a1 = ((-total / 2) * Math.PI) / 180;
      var a2 = ((total / 2) * Math.PI) / 180;
      var x1 = R * Math.cos(a1);
      var y1 = CY + R * Math.sin(a1);
      var x2 = R * Math.cos(a2);
      var y2 = CY + R * Math.sin(a2);
      svg.innerHTML =
        '<path d="M ' +
        x1.toFixed(1) +
        " " +
        y1.toFixed(1) +
        " A " +
        R +
        " " +
        R +
        " 0 " +
        (total > 180 ? 1 : 0) +
        " 1 " +
        x2.toFixed(1) +
        " " +
        y2.toFixed(1) +
        '" fill="none" stroke="var(--line)" stroke-width="1.5"/>';
    }

    function baseAngleDeg(i) {
      return -SPAN / 2 + i * step;
    }

    function angleDeg(i) {
      return baseAngleDeg(i) + rotation;
    }

    function centerRotationFor(i) {
      return -baseAngleDeg(i);
    }

    function render() {
      // 先根据"谁在弧线正中"确定当前年份并切换内容，再渲染视觉状态，
      // 否则高亮和内容会在同一帧里错开（初始帧就会出现高亮 A、内容 B）
      var nearestIndex = 0;
      var nearestDist = Infinity;
      for (var i = 0; i < N; i++) {
        var dist = Math.abs(angleDeg(i));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }
      if (nearestDist < step / 2 && nearestIndex !== activeIndex) {
        activeIndex = nearestIndex;
        loadYear(activeIndex);
      }

      for (var j = 0; j < N; j++) {
        var a = (angleDeg(j) * Math.PI) / 180;
        var x = R * Math.cos(a);
        var y = CY + R * Math.sin(a);
        var isActive = j === activeIndex;
        // 用 transform 定位，避免每帧触发重排
        items[j].style.transform =
          "translate(" +
          x +
          "px, " +
          y +
          "px) translate(-50%, -50%) scale(" +
          (isActive ? 1.25 : 1) +
          ")";
        items[j].style.fontSize = (isActive ? yearFont[1] : yearFont[0]) + "px";
        items[j].classList.toggle("active", isActive);
      }
    }

    function clampRotation() {
      rotation = Math.max(-MARGIN, Math.min(MARGIN, rotation));
    }

    var raf = null;
    function animateRotationTo(target, duration) {
      duration = duration || 320;
      target = Math.max(-MARGIN, Math.min(MARGIN, target));
      var start = rotation;
      var t0 = performance.now();
      if (raf) cancelAnimationFrame(raf);
      function frame(now) {
        var t = Math.min(1, (now - t0) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        rotation = start + (target - start) * eased;
        render();
        if (t < 1) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    function nearestIndexOf(rot) {
      var nearestIndex = 0;
      var nearestDist = Infinity;
      for (var i = 0; i < N; i++) {
        var d = Math.abs(baseAngleDeg(i) + rot);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIndex = i;
        }
      }
      return nearestIndex;
    }

    function selectYear(i) {
      if (activeIndex !== i) {
        activeIndex = i;
        loadYear(i);
      }
      animateRotationTo(centerRotationFor(i));
    }

    // 逐级展开：选中年份 → 月份列表；点击月份 → 该月文章标题
    function loadYear(i) {
      var group = byYear[years[i]];
      monthsEl.innerHTML = "";
      postsEl.innerHTML = "";
      group.months.forEach(function (month, order) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "arc-month";
        button.textContent = Number(month) + "月";
        button.style.animationDelay = order * 40 + "ms";
        button.addEventListener("click", function () {
          selectMonth(i, month, button);
        });
        monthsEl.appendChild(button);
      });
      if (group.months.length) {
        selectMonth(i, group.months[0], monthsEl.firstChild);
      }
    }

    function selectMonth(i, month, button) {
      Array.prototype.forEach.call(monthsEl.children, function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");
      postsEl.innerHTML = "";
      byYear[years[i]].byMonth[month].forEach(function (post, order) {
        var link = document.createElement("a");
        link.className = "arc-post";
        link.href = post.url;
        link.textContent = post.title;
        link.style.animationDelay = order * 40 + "ms";
        postsEl.appendChild(link);
      });
    }

    years.forEach(function (year) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "arc-year";
      button.textContent = year;
      axis.appendChild(button);
      items.push(button);
    });

    // 指针捕获会让年份按钮收不到原生 click，所以点击统一在 pointerup 里
    // 按移动距离判定：几乎没移动时用坐标反算最近的年份并手动选中。
    var dragging = false;
    var lastY = 0;
    var lastT = 0;
    var velocity = 0;
    var dragMoved = 0;
    var CLICK_THRESHOLD = 6;

    axis.addEventListener("pointerdown", function (event) {
      dragging = true;
      lastY = event.clientY;
      lastT = performance.now();
      dragMoved = 0;
      velocity = 0;
      if (raf) cancelAnimationFrame(raf);
      axis.setPointerCapture(event.pointerId);
    });

    window.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var now = performance.now();
      var dy = event.clientY - lastY;
      var dt = Math.max(1, now - lastT);
      var dRot = dy * 0.28;

      dragMoved += Math.abs(dy);
      rotation += dRot;
      clampRotation();
      render();

      velocity = velocity * 0.7 + (dRot / dt) * 0.3;
      lastY = event.clientY;
      lastT = now;
    });

    window.addEventListener("pointerup", function (event) {
      if (!dragging) return;
      dragging = false;

      if (dragMoved < CLICK_THRESHOLD) {
        var rect = axis.getBoundingClientRect();
        var clickAngle =
          (Math.atan2(
            event.clientY - rect.top - CY,
            event.clientX - rect.left,
          ) *
            180) /
          Math.PI;
        var nearestIndex = 0;
        var nearestDist = Infinity;
        for (var i = 0; i < N; i++) {
          var d = Math.abs(angleDeg(i) - clickAngle);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIndex = i;
          }
        }
        if (nearestDist < step) selectYear(nearestIndex);
        return;
      }

      // 松手后按惯性再滑一段，再吸附到最近的年份
      var projected = rotation + velocity * 45;
      var clamped = Math.max(-MARGIN, Math.min(MARGIN, projected));
      animateRotationTo(centerRotationFor(nearestIndexOf(clamped)), 380);
    });

    var wheelTimer = null;
    var wheelVelocity = 0;
    var lastWheelT = 0;

    axis.addEventListener(
      "wheel",
      function (event) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        if (raf) cancelAnimationFrame(raf);

        var now = performance.now();
        var dt = Math.max(1, now - lastWheelT);
        // deltaMode 1 = 行（普通鼠标滚轮），统一换算成像素量级
        var rawDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
        var dRot = rawDelta * 0.11;

        rotation += dRot;
        clampRotation();
        render();

        wheelVelocity = wheelVelocity * 0.75 + (dRot / dt) * 0.25;
        lastWheelT = now;

        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(function () {
          var projected = rotation + wheelVelocity * 55;
          var clamped = Math.max(-MARGIN, Math.min(MARGIN, projected));
          wheelVelocity = 0;
          animateRotationTo(centerRotationFor(nearestIndexOf(clamped)), 380);
        }, 160);
      },
      { passive: false },
    );

    // 初始高亮 = 弧线正中的年份，保证"正中 = 当前展示"从第一帧就成立
    activeIndex = nearestIndexOf(0);
    drawTrack();
    render();
    loadYear(activeIndex);
  })();

  /* ── 搜索结果页 ─────────────────────────── */
  (function () {
    var page = document.querySelector("[data-search-page]");
    if (!page) return;

    var input = document.getElementById("searchInput");
    var summary = document.getElementById("searchSummary");
    var list = document.getElementById("searchResults");
    var hint = document.getElementById("searchHint");
    var keyword =
      new URLSearchParams(window.location.search).get("keyword") || "";

    input.value = keyword;

    async function search(value) {
      if (!value) return;

      if (hint) hint.style.display = "none";
      summary.textContent = "正在搜索…";
      list.innerHTML = "";

      try {
        var response = await fetch(
          "/apis/api.halo.run/v1alpha1/indices/-/search",
          {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword: value,
              limit: 100,
              highlightPreTag: "<mark>",
              highlightPostTag: "</mark>",
            }),
          },
        );
        var data = await response.json();
        var hits = data.hits || [];

        if (!hits.length) {
          summary.textContent = "";
          list.innerHTML =
            '<div class="empty-state"><span class="empty-mark">✿</span>没有找到与「' +
            value +
            "」相关的文章</div>";
          return;
        }

        summary.textContent =
          "找到 " + hits.length + " 条与「" + value + "」相关的结果";
        hits.forEach(function (hit) {
          // 复用文章卡片：搜索结果没有封面图，直接使用无图版卡片
          var card = document.createElement("a");
          card.className = "post-card post-card--text";
          card.href = hit.permalink;

          var main = document.createElement("div");
          main.className = "post-main";

          var title = document.createElement("p");
          title.className = "post-title serif";
          title.innerHTML = hit.title || "";
          main.appendChild(title);

          if (hit.description) {
            var excerpt = document.createElement("p");
            excerpt.className = "post-excerpt";
            excerpt.innerHTML = hit.description;
            main.appendChild(excerpt);
          }

          card.appendChild(main);
          list.appendChild(card);
        });
      } catch (error) {
        summary.textContent = "";
        list.innerHTML =
          '<div class="empty-state"><span class="empty-mark">✿</span>搜索服务暂不可用</div>';
      }
    }

    page.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = input.value.trim();
      if (!value) return;
      history.replaceState(null, "", "?keyword=" + encodeURIComponent(value));
      search(value);
    });

    if (keyword) search(keyword);
  })();
})();

/* ── 文章系列 ───────────────────────────────────────
   1. 分类页（.post-list--collapse-series）：同系列文章收成一张系列卡，
      卡片本身由模板渲染在隐藏的 <template class="series-hint"> 里，
      这里只负责「取第一张、其余收掉」；
   2. 系列页（.series-feed）：剥掉卡片标题里自带的「第X篇：」前缀。
   两件事都放在前端，模板只输出数据，避免 Thymeleaf 表达式差异把整页打成 500。 */
(function () {
  var TITLE_PREFIX = /^第[一二三四五六七八九十0-9]+篇：/;
  var seenSeries = {};

  function stripTitlePrefix() {
    document.querySelectorAll(".series-feed .post-title").forEach(function (el) {
      var text = el.textContent.trim();
      if (TITLE_PREFIX.test(text)) el.textContent = text.replace(TITLE_PREFIX, "");
    });
  }

  /* 系列卡：由模板输出的数据属性现场拼出来。
     卡片本身不写进模板，避免在文章卡内部嵌套 <a>（HTML 不允许，浏览器会拆掉外层链接）。 */
  function buildSeriesCard(hint) {
    var name = hint.getAttribute("data-name");
    var link = document.createElement("a");
    link.className = "post-card post-card--series";
    link.href = hint.getAttribute("data-url") || "#";

    var main = document.createElement("div");
    main.className = "post-main";

    var title = document.createElement("p");
    title.className = "post-title serif";
    title.textContent = name;

    var sub = document.createElement("div");
    sub.className = "post-sub";

    var chips = document.createElement("div");
    chips.className = "post-tags";
    var chip = document.createElement("span");
    chip.className = "tag-pill tag-pill--pink";
    chip.textContent = "系列";
    chips.appendChild(chip);

    var date = document.createElement("span");
    date.className = "post-date";
    date.textContent = "共 " + hint.getAttribute("data-count") + " 篇 · " + hint.getAttribute("data-latest");

    sub.appendChild(chips);
    sub.appendChild(date);
    main.appendChild(title);
    main.appendChild(sub);
    link.appendChild(main);
    return link;
  }

  function collapseSeries(root) {
    root.querySelectorAll(".series-hint").forEach(function (hint) {
      var name = hint.getAttribute("data-name");
      // 提示就在它所属的那张文章卡内部（片段把两者输出在同一张卡里）
      var card = hint.closest(".post-card");
      hint.remove();

      if (!name || !card) return;
      // 已经被替换成系列卡的，不再处理（防御：重复执行时不要误删）
      if (card.classList.contains("post-card--series")) return;

      // 同一个系列只保留列表里最先出现的那张，其余文章卡整张收掉
      if (seenSeries[name]) {
        card.remove();
        return;
      }
      seenSeries[name] = true;
      card.replaceWith(buildSeriesCard(hint));
    });
  }

  var collapseRoot = document.querySelector(".post-list--collapse-series");
  var seriesFeed = document.querySelector(".series-feed");
  if (!collapseRoot && !seriesFeed) return;

  if (collapseRoot) collapseSeries(collapseRoot);
  if (seriesFeed) stripTitlePrefix();

  // 无限滚动追加的节点同样要过一遍（去掉同系列的重复卡、剥掉标题前缀）
  var list = collapseRoot || seriesFeed;
  if (list) {
    new MutationObserver(function () {
      collapseSeries(list);
      stripTitlePrefix();
    }).observe(list, { childList: true });
  }
})();

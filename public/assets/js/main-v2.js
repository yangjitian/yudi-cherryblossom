/* 雨滴·手记 —— 全站脚本
   主题切换 / 花瓣 / 抽屉菜单 / 搜索框 / 目录 / 无限滚动 / 搜索页 */

(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ── 移动端抽屉 ─────────────────────────── */
  var hamburger = document.getElementById("hamburgerBtn");
  var drawer = document.getElementById("mobileDrawer");
  var drawerClose = document.getElementById("drawerClose");

  if (hamburger && drawer) {
    hamburger.addEventListener("click", function () {
      drawer.classList.add("open");
    });
    drawerClose.addEventListener("click", function () {
      drawer.classList.remove("open");
    });
  }

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

  /* ── 飘落花瓣 ───────────────────────────── */
  (function () {
    var field = document.getElementById("petalField");
    if (!field || reduceMotion) return;

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

      var size = 6 + Math.random() * 8;
      var fallDuration = 8 + Math.random() * 7;
      var swayDuration = 3 + Math.random() * 2;
      var depth = 0.4 + Math.random() * 0.6;

      el.style.left = Math.random() * 100 + "vw";
      el.style.width = size * depth + "px";
      el.style.height = size * depth * 0.78 + "px";
      el.style.animationDuration = fallDuration + "s, " + swayDuration + "s";
      el.style.filter = depth < 0.6 ? "blur(0.6px)" : "none";
      if (mode !== "full") {
        el.style.animationName = "petal-fall, petal-sway";
        el.style.animationIterationCount = "1, infinite";
      }

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
        { threshold: 0 }
      ).observe(scope);
    }

    for (var i = 0; i < 5; i++) setTimeout(spawn, i * 900);
    setInterval(spawn, 1700);
  })();

  /* ── 文章目录 ───────────────────────────── */
  (function () {
    var prose = document.querySelector(".prose");
    var sidebar = document.getElementById("tocSidebar");
    if (!prose || !sidebar) return;

    var headings = prose.querySelectorAll("h2, h3");
    if (headings.length < 2) {
      sidebar.remove();
      var inline = document.getElementById("tocInline");
      if (inline) inline.remove();
      return;
    }

    var items = [];
    headings.forEach(function (heading) {
      if (!heading.id) {
        heading.id = "heading-" + items.length;
      }
      items.push({ id: heading.id, text: heading.textContent, sub: heading.tagName === "H3" });
    });

    function render(list) {
      list.innerHTML = "";
      items.forEach(function (item) {
        var li = document.createElement("li");
        if (item.sub) li.className = "sub";
        var a = document.createElement("a");
        a.href = "#" + item.id;
        a.textContent = item.text;
        li.appendChild(a);
        list.appendChild(li);
      });
    }

    render(sidebar.querySelector("ul"));
    var inline = document.getElementById("tocInline");
    if (inline) render(inline.querySelector("ul"));

    var links = document.querySelectorAll(".toc-sidebar a");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var link = document.querySelector('.toc-sidebar a[href="#' + entry.target.id + '"]');
          if (!link) return;
          links.forEach(function (l) {
            l.classList.remove("active");
          });
          link.classList.add("active");
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    headings.forEach(function (heading) {
      observer.observe(heading);
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
    var group = container.getAttribute("data-group");
    var archiveEmpty = document.getElementById("archiveEmpty");
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
        var year = node.getAttribute("data-year");
        // 归档页：与上一组同年时合并条目，避免出现重复年份标题
        var last = container.lastElementChild;
        if (year && last && last.getAttribute("data-year") === year) {
          var target = last.querySelector("ul");
          node.querySelectorAll("li").forEach(function (li) {
            target.appendChild(li);
          });
          return;
        }
        container.appendChild(node);
      });
    }

    function monthDay(value) {
      var date = new Date(value);
      if (isNaN(date.getTime())) return "";
      return ("0" + (date.getMonth() + 1)).slice(-2) + "." + ("0" + date.getDate()).slice(-2);
    }

    // 与服务端渲染的 post-card 结构保持一致，无封面时不渲染图片区域
    function createCard(post) {
      var card = document.createElement("a");
      card.className = "post-card" + (post.spec.cover ? "" : " post-card--text");
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
        pill.className = index % 2 === 0 ? "tag-pill tag-pill--pink" : "tag-pill tag-pill--blue";
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

    // 归档时间线：按发布时间年份分组追加，同年合并到一个年份区块
    function appendArchiveItem(post) {
      var year = String(new Date(post.spec.publishTime).getFullYear());
      var section = container.lastElementChild;

      if (!section || section.getAttribute("data-year") !== year) {
        section = document.createElement("section");
        section.className = "archive-year";
        section.setAttribute("data-year", year);

        var label = document.createElement("div");
        label.className = "archive-year__label";
        label.textContent = year;
        section.appendChild(label);

        var items = document.createElement("ul");
        items.className = "archive-year__items";
        section.appendChild(items);

        container.appendChild(section);
      }

      var item = document.createElement("li");
      item.className = "archive-item";

      var date = document.createElement("span");
      date.className = "archive-item__date";
      date.textContent = monthDay(post.spec.publishTime);
      item.appendChild(date);

      var title = document.createElement("h2");
      title.className = "archive-item__title";
      var link = document.createElement("a");
      link.href = post.status.permalink;
      link.textContent = post.spec.title;
      title.appendChild(link);
      item.appendChild(title);

      section.querySelector("ul").appendChild(item);
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
          if (group === "year") {
            appendArchiveItem(post);
          } else {
            container.appendChild(createCard(post));
          }
        });
        page += 1;
        totalPages = data.totalPages || totalPages;
        if (archiveEmpty) archiveEmpty.hidden = container.children.length > 0;
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
      { rootMargin: "200px" }
    ).observe(sentinel);
  })();

  /* ── 搜索结果页 ─────────────────────────── */
  (function () {
    var page = document.querySelector("[data-search-page]");
    if (!page) return;

    var input = document.getElementById("searchInput");
    var summary = document.getElementById("searchSummary");
    var list = document.getElementById("searchResults");
    var hint = document.getElementById("searchHint");
    var keyword = new URLSearchParams(window.location.search).get("keyword") || "";

    input.value = keyword;

    async function search(value) {
      if (!value) return;

      if (hint) hint.style.display = "none";
      summary.textContent = "正在搜索…";
      list.innerHTML = "";

      try {
        var response = await fetch("/apis/api.halo.run/v1alpha1/indices/-/search", {
          method: "post",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: value,
            limit: 100,
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
          }),
        });
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

        summary.textContent = "找到 " + hits.length + " 条与「" + value + "」相关的结果";
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

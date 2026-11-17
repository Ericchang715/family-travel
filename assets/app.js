(() => {
  "use strict";
  const M = globalThis.TravelModel;
  const { icon, h, attrs, button, pill, tags, option, options, select, date, dateRange, money, meta, note, info, heading, panel, empty, table } = globalThis.TravelUI;
  const routes = {
    overview: ["規劃總覽", "grid"], compare: ["方案比較", "compare"],
    itinerary: ["行程草案", "route"], bookings: ["航班與住宿", "flight"],
    budget: ["預算與分攤", "wallet"], tasks: ["待辦與文件", "list"],
    family: ["家庭偏好", "users"], archive: ["已完成旅程", "archive"],
    data: ["資料與使用說明", "help"], review: ["待確認資料", "flag"], plan: ["方案內容", "pin"]
  };
  const navGroups = [
    ["旅行規劃", ["overview", "compare", "itinerary", "bookings"]],
    ["出發準備", ["budget", "tasks", "family", "archive"]]
  ];
  const artwork = { default: "hero.webp", hokkaido: "hokkaido.webp", seoul: "seoul.webp", germany: "germany.webp", italy: "italy.webp" };
  const initialFilters = { destination: "", date: "", from: "", to: "", budget: "", min: null, max: null, activity: "", status: "" };
  const verificationKeys = ["trips", "itinerary", "flights", "stays", "budgetItems", "expenses", "documents"];
  const tones = { idea: "warm", planning: "blue", ready: "good", completed: "good" };
  const path = location.pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "");
  const storageKey = "family-travel-workbench:v1:" + path;

  const $ = id => document.getElementById(id);
  const workspace = $("workspace");
  const dialog = $("dialog");
  const editor = $("editor");
  const fileInput = $("import");
  const toast = $("toast");
  let state = M.validate(globalThis.TravelSeed);
  let saved = null;
  let memoryOnly = false;
  let unreadable = false;
  let route = { page: "overview", id: "" };
  let filters = { ...initialFilters };
  let compareIds = null;
  let compareSort = "original";
  let itinerarySort = "manual";
  let itineraryActivity = "";
  let taskFilter = "";
  let onSubmit = null;
  let toastTimer;

  const active = () => state.trips.filter(trip => trip.status !== "completed");
  const archived = () => state.trips.filter(trip => trip.status === "completed");
  const find = (key, id) => state[key].find(item => item.id === id);
  const related = (key, id) => state[key].filter(item => item.tripId === id);
  const href = (page, id) => "#" + page + (id ? "/" + id : "");
  const title = record => record.title || record.name;
  const memberName = id => find("members", id)?.name || "未指定";
  const tripName = id => find("trips", id)?.name || "全家共用";
  const pending = record => record.status !== "done";
  const cap = trip => trip.budgetLimit ?? M.sum(related("budgetItems", trip.id));
  const tripDates = trip => dateRange(trip.startDate, trip.endDate, trip.status === "completed" ? "日期待補" : "日期待定");
  const badge = trip => pill(M.tripStatus[trip.status], tones[trip.status]);
  const verified = item => item.confirmed ? pill("已確認", "good") : pill("待確認", "outline");
  const actions = (...items) => '<div class="actions">' + items.join("") + "</div>";
  const amountText = value => '<span class="money">' + h(money(value)) + "</span>";
  const titleOf = key => M.collections[key].title;
  const linkTo = (label, page, id, glyph = "arrow", variant = "link") => button(label, { href: href(page, id), glyph, variant });
  const sourceLink = value => {
    const url = M.safeURL(value);
    return url ? '<a class="source" href="' + h(url) + '" target="_blank" rel="noopener noreferrer">開啟來源' + icon("external") + "</a>" : "";
  };

  function load() {
    try {
      saved = localStorage.getItem(storageKey);
    } catch { memoryOnly = true; }
    if (saved !== null) {
      try { state = M.validate(JSON.parse(saved)); } catch { unreadable = true; }
    }
  }

  function store(next, recovery = false) {
    const validated = M.validate(next);
    if (unreadable && !recovery) throw new Error("原有資料無法讀取。可在「資料與使用說明」匯入有效備份。");
    if (!memoryOnly) {
      if (localStorage.getItem(storageKey) !== saved) throw new Error("另一個分頁已修改資料。請關閉視窗並重新整理後再試。");
      const raw = JSON.stringify(validated);
      try {
        localStorage.setItem(storageKey, raw);
        saved = raw;
      } catch {
        throw new Error("瀏覽器無法儲存這次修改。請確認網站儲存空間或權限後再試。");
      }
    }
    state = validated;
    unreadable = false;
  }

  function synchronize() {
    if (dialog.open || memoryOnly) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === saved) return;
      state = M.validate(raw === null ? globalThis.TravelSeed : JSON.parse(raw));
      saved = raw;
      unreadable = false;
      render();
      announce("已讀取此瀏覽器其他分頁的修改。");
    } catch {
      announce("無法讀取其他分頁的資料。請重新整理後再試。", true);
    }
  }

  function announce(message, error = false) {
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.toggle("error", error);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, error ? 6000 : 3500);
  }

  function savedMessage(message) {
    announce(message + (memoryOnly ? "。請匯出備份保存本次修改。" : "。"));
  }

  function navLink(page, activePage) {
    const [label, glyph] = routes[page];
    return '<a href="' + href(page) + '" class="nav-link"' + (page === activePage ? ' aria-current="page"' : "") + ">" + icon(glyph) + h(label) + "</a>";
  }

  function routeFromHash() {
    const [page, id = ""] = location.hash.slice(1).split("/");
    return Object.hasOwn(routes, page) ? { page, id } : { page: "overview", id: "" };
  }

  function render(focus = false, keepFocus = false) {
    const focussed = keepFocus ? document.activeElement?.id : "";
    const [label] = routes[route.page];
    const activePage = route.page === "plan" ? (find("trips", route.id)?.status === "completed" ? "archive" : "overview") : route.page;
    $("page-label").textContent = label;
    document.title = route.page === "overview" ? "全家人出國旅遊規劃工作台" : label + "｜遠行計畫";
    $("navigation").innerHTML = navGroups.map(([name, keys]) => '<div class="nav-group"><p class="nav-label">' +
      h(name) + "</p>" + keys.map(key => navLink(key, activePage)).join("") + "</div>").join("");
    $("footer-nav").innerHTML = navLink("data", activePage);
    $("save-indicator").textContent = unreadable || memoryOnly ? "儲存待處理" : "本機儲存";
    $("save-indicator").classList.toggle("issue", unreadable || memoryOnly);
    const warning = unreadable ? info("瀏覽器的原有資料無法讀取。請在「資料與使用說明」匯入有效備份。") :
      memoryOnly ? info("瀏覽器儲存目前無法使用。資料暫留在此頁，可用「匯出備份」保存。") : "";
    workspace.innerHTML = warning + pages[route.page]();
    if (focussed) $(focussed)?.focus({ preventScroll: true });
    if (focus) {
      window.scrollTo(0, 0);
      $("page-heading")?.focus({ preventScroll: true });
    }
  }

  function add(key, id = "", variant = "primary", day) {
    return button("新增" + titleOf(key), { glyph: "plus", action: "edit", variant,
      attr: { "data-key": key, "data-trip": id, "data-day": day } });
  }

  function edit(key, item, only = false) {
    return button("編輯" + titleOf(key), { glyph: "edit", action: "edit", only, attr: { "data-key": key, "data-id": item.id } });
  }

  function remove(key, item, only = true) {
    return button("刪除" + titleOf(key), { glyph: "trash", action: "delete", only, variant: only ? "remove" : "subtle",
      attr: { "data-key": key, "data-id": item.id } });
  }

  const entryActions = (key, item, extra = "") => actions(extra, edit(key, item, true), remove(key, item));

  function stat(label, value, glyph, tone, target = "") {
    const tag = target ? "a" : "div";
    return "<" + tag + attrs({ class: "stat", href: target || undefined }) + '><span class="stat-icon ' + tone + '">' + icon(glyph) +
      '</span><span><span class="stat-name">' + h(label) + '</span><strong class="stat-count">' + h(value) +
      "</strong></span>" + (target ? icon("arrow", "stat-arrow") : "") + "</" + tag + ">";
  }

  function reviewItems() {
    const ids = new Set(active().map(item => item.id));
    return verificationKeys.flatMap(key => state[key].filter(item =>
      !item.confirmed && (key === "trips" ? ids.has(item.id) : !item.tripId || ids.has(item.tripId))
    ).map(item => ({ key, item })));
  }

  function types(trip) {
    return [...new Set([...trip.activities, ...related("itinerary", trip.id).map(item => item.activity).filter(Boolean)])];
  }

  function filterField(key, label, glyph, entries) {
    return '<label class="filter ' + (filters[key] ? "filter-active" : "") + '"><span>' + icon(glyph) + h(label) + "</span>" +
      select("filter-" + key, label, entries, filters[key], { "data-filter": key }) + "</label>";
  }

  function filtersMarkup(plans) {
    const dest = [...new Set(plans.map(item => item.destination))].sort((a, b) => a.localeCompare(b, "zh-TW"));
    const activities = [...new Set(plans.flatMap(types))].sort((a, b) => a.localeCompare(b, "zh-TW"));
    const prep = Object.entries(M.tripStatus).filter(([key]) => key !== "completed");
    const rangeDate = filters.date === "range";
    const rangeBudget = filters.budget === "range";
    const dates = [filters.from && date(filters.from), filters.to && date(filters.to)].filter(Boolean).join(" 至 ");
    const budgets = [filters.min === null ? "" : money(filters.min), filters.max === null ? "" : money(filters.max)].filter(Boolean).join(" 至 ");
    return '<div class="filters" aria-label="篩選待規劃方案">' +
      filterField("destination", "目的地", "pin", [["", "所有目的地"], ...dest.map(value => [value, value])]) +
      filterField("date", "日期", "calendar", [["", "所有日期"], ["unscheduled", "日期待定"], ["scheduled", "已有日期"],
        ["range", rangeDate ? dates : "設定日期區間"], ...(rangeDate ? [["adjust", "修改日期區間"]] : [])]) +
      filterField("budget", "預算", "wallet", [["", "所有預算"], ["missing", "預算待填"], ["low", "NT$50,000 以下"],
        ["mid", "NT$50,001 至 100,000"], ["high", "超過 NT$100,000"], ["range", rangeBudget ? budgets : "設定預算範圍"],
        ...(rangeBudget ? [["adjust", "修改預算範圍"]] : [])]) +
      filterField("activity", "活動類型", "tags", [["", "所有活動"], ...activities.map(value => [value, value])]) +
      filterField("status", "準備狀態", "list", [["", "所有狀態"], ...prep, ["unverified", "基本資料待確認"]]) + "</div>";
  }

  function card(trip) {
    const budget = cap(trip);
    return '<article class="card"><div class="card-image"><img src="./assets/' + artwork[trip.artwork] + '" alt="" width="640" height="340">' +
      '<span class="place">' + icon("pin") + h(trip.country) + '</span></div><div class="card-content"><div class="card-title"><h3>' + h(trip.destination) +
      "</h3>" + badge(trip) + '</div><p class="small break">' + h(trip.name) + '</p><div class="card-meta"><div>' + icon("calendar") + h(tripDates(trip)) +
      "</div><div>" + icon("wallet") + (budget === null ? "預算待填" : amountText(budget)) + "</div></div>" + tags(trip.activities) +
      '</div><footer class="card-footer">' + button("開啟方案", { href: href("plan", trip.id), glyph: "arrow", variant: "link",
        attr: { "aria-label": "開啟" + trip.name } }) + edit("trips", trip, true) + "</footer></article>";
  }

  function overview() {
    const plans = active();
    const completed = archived();
    const plannedIds = new Set(plans.map(item => item.id));
    const tasks = state.tasks.filter(item => pending(item) && (!item.tripId || plannedIds.has(item.tripId)));
    const visible = plans.filter(item => M.matches(item, filters, cap(item), types(item)));
    const filtered = Object.keys(initialFilters).some(key => initialFilters[key] !== filters[key]);
    const taskList = tasks.length ? '<ul class="mini-list">' + tasks.slice(0, 4).map(item => '<li><span class="break">' +
      h(item.title) + "</span>" + pill(item.dueDate ? date(item.dueDate) : M.taskStatus[item.status], "warm") + "</li>").join("") + "</ul>" :
      '<p class="small">目前沒有未完成的待辦。</p>';
    const archiveList = completed.length ? '<ul class="mini-list">' + completed.slice(-4).map(trip => '<li><a href="' +
      href("plan", trip.id) + '">' + h(trip.destination) + "</a>" + badge(trip) + "</li>").join("") + "</ul>" :
      '<p class="small">已完成的旅行會顯示在這裡。</p>';
    return '<section class="hero" aria-labelledby="page-heading"><span class="hero-kicker">' + icon("flag") +
      '近期目標</span><h1 id="page-heading" tabindex="-1">全家人出國旅遊<br>規劃工作台</h1><p>選出目的地，一起確認假期與預算。</p>' +
      actions(linkTo("比較目的地", "compare", "", "compare", "lime"), add("trips", "", "glass")) +
      '</section><div class="stats" aria-label="規劃摘要">' +
      stat("待規劃方案", plans.length, "pin", "green", "#plans") + stat("待辦事項", tasks.length, "list", "blue", "#tasks") +
      stat("待確認資料", reviewItems().length, "flag", "warm", "#review") + stat("已完成旅程", completed.length, "done", "olive", "#archive") +
      '</div><section id="plans" aria-labelledby="plans-title"><header class="section-heading"><div><h2 id="plans-title">待規劃方案</h2><span class="small" aria-live="polite">' +
      h((filtered ? "符合 " + visible.length + " / " + plans.length : plans.length) + " 個方案") + "</span></div>" +
      button("清除篩選", { glyph: "filter", action: "clear-filters", variant: "link", attr: { disabled: !filtered } }) +
      "</header>" + filtersMarkup(plans) + (visible.length ? '<div class="cards">' + visible.map(card).join("") + "</div>" :
        empty("pin", filtered ? "找不到符合的方案" : "目前沒有待規劃方案", filtered ? "可以調整篩選條件。" : "新增一個想去的目的地。", filtered ?
          button("清除篩選", { action: "clear-filters" }) : add("trips"))) +
      '</section><div class="columns lower">' + panel("出發待辦", taskList, { glyph: "list", actions: linkTo("開啟待辦", "tasks") }) +
      panel("已完成旅程", archiveList, { glyph: "archive", actions: linkTo("查看旅程", "archive") }) + "</div>";
  }

  function compare() {
    const plans = active();
    const chosen = plans.filter(item => !compareIds || compareIds.has(item.id));
    const score = item => M.score(item.ratings, state.weights);
    if (compareSort === "score") chosen.sort((a, b) => (score(b) ?? -1) - (score(a) ?? -1));
    const checkbox = trip => '<label class="check-chip"><input' + attrs({
      type: "checkbox", id: "pick-" + trip.id, checked: !compareIds || compareIds.has(trip.id), "data-pick": trip.id
    }) + ">" + h(trip.name) + "</label>";
    const total = Object.values(state.weights).reduce((sum, value) => sum + value, 0);
    const pc = new Intl.NumberFormat("zh-TW", { style: "percent", maximumFractionDigits: 1 });
    const weightTags = tags(Object.entries(M.criteria).map(([key, label]) => label + " " + pc.format(state.weights[key] / total)));
    const rows = [
      ["預計日期", trip => h(tripDates(trip)) + meta(trip.dateNotes)],
      ["預算上限", trip => amountText(trip.budgetLimit)],
      ["預估總額", trip => amountText(M.sum(related("budgetItems", trip.id)))],
      ["活動類型", trip => trip.activities.length ? tags(trip.activities) : "待填"],
      ["準備狀態", trip => actions(badge(trip), verified(trip))],
      ["航班／住宿", trip => h(related("flights", trip.id).length + " 筆航班，" + related("stays", trip.id).length + " 筆住宿")],
      ...Object.entries(M.criteria).map(([key, label]) => [label, trip => trip.ratings[key] === null ? "待評" : h(trip.ratings[key] + " / 5")]),
      ["加權總分", trip => score(trip) === null ? "待評分" : '<strong class="score">' + h(score(trip)) + "</strong> / 100"],
      ["評分操作", trip => button("編輯評分", { action: "rating", glyph: "edit", attr: { "data-id": trip.id, "aria-label": "編輯" + trip.name + "評分" } })]
    ];
    const controls = '<div class="compare-tools"><span class="small">' + h(chosen.length + " 個方案列入比較") + '</span><label class="small">排序 ' +
      select("compare-sort", "比較排序", [["original", "方案順序"], ["score", "依總分由高到低"]], compareSort, { class: "choice" }) + "</label></div>";
    const matrix = chosen.length ? table("多方案比較表",
      ["比較項目", ...chosen.map(trip => '<a href="' + href("plan", trip.id) + '">' + h(trip.name) + "</a>" + meta(trip.country + "，" + trip.destination))],
      rows.map(([label, cell]) => [h(label), ...chosen.map(cell)]), "comparison") : empty("compare", "請選擇比較方案", "可同時勾選多個方案。");
    return heading("方案比較", "勾選候選方案，並排核對再評分。", button("調整權重", { glyph: "sliders", action: "weight", variant: "primary" })) +
      panel("比較方案", plans.length ? '<div class="compare-options">' + plans.map(checkbox).join("") + "</div>" + controls + matrix :
        empty("compare", "尚無可比較的方案", "新增一個待規劃方案即可開始。", add("trips")), { glyph: "compare" }) +
      panel("評分權重", '<div class="weights">' + weightTags + '</div><p class="small">各項評分為 1 至 5 分。有權重的項目全填後，會換算為百分制。</p>', { glyph: "sliders" });
  }

  function archiveButton(trip) {
    const done = trip.status === "completed";
    return button(done ? "移回規劃" : "標記已完成", { action: "archive", glyph: done ? "back" : "check",
      variant: done ? "subtle" : "lime", attr: { "data-id": trip.id } });
  }

  function planPage() {
    const trip = find("trips", route.id);
    if (!trip) return heading("方案內容") + empty("pin", "找不到這個方案", "可回規劃總覽重新選擇。", linkTo("回規劃總覽", "overview", "", "back"));
    const done = trip.status === "completed";
    const facts = [
      [done ? "旅程日期" : "預計日期", tripDates(trip), trip.dateNotes],
      ["全家預算上限", money(trip.budgetLimit)], ["預算項目合計", money(M.sum(related("budgetItems", trip.id)))]
    ];
    const tools = [
      ["itinerary", related("itinerary", trip.id).length + " 項活動"],
      ["bookings", related("flights", trip.id).length + " 筆航班，" + related("stays", trip.id).length + " 筆住宿"],
      ["budget", related("expenses", trip.id).length + " 筆支出"],
      ["tasks", related("tasks", trip.id).filter(pending).length + " 項待辦"]
    ];
    return '<div class="scope">' + linkTo(done ? "回已完成旅程" : "回規劃總覽", done ? "archive" : "overview", "", "back") +
      '</div><section class="trip-banner" style="--image:url(./assets/' + artwork[trip.artwork] + ')"><div><p>' + h(trip.country + "，" + trip.destination) +
      '</p><h1 id="page-heading" tabindex="-1">' + h(trip.name) + "</h1><div class='tags'>" + badge(trip) + verified(trip) + "</div></div>" +
      actions(edit("trips", trip), archiveButton(trip)) + '</section><dl class="fact-grid">' +
      facts.map(([label, value, detail]) => '<div class="fact"><dt>' + h(label) + "</dt><dd>" + h(value) + meta(detail) + "</dd></div>").join("") +
      '</dl><div class="columns">' + tools.map(([page, detail]) => {
        const [label, glyph] = routes[page];
        return '<a class="panel trip-tool" href="' + href(page, trip.id) + '"><div><span class="stat-icon">' +
          icon(glyph) + "</span><span><h2>" + h(label) + '</h2><span class="small">' + h(detail) + "</span></span></div>" + icon("arrow") + "</a>";
      }).join("") + "</div>" + (trip.activities.length || trip.notes ? panel("活動類型與備註", tags(trip.activities) + note(trip.notes), { glyph: "tags" }) : "") +
      remove("trips", trip, false);
  }

  function selectedScope(all = false) {
    if (all && route.id === "~shared") return "~shared";
    if (find("trips", route.id)) return route.id;
    return all ? "" : active()[0]?.id || archived()[0]?.id || "";
  }

  function groupedTrips(current) {
    return [[active(), "待規劃方案"], [archived(), "已完成旅程"]].map(([group, label]) =>
      group.length ? '<optgroup label="' + label + '">' + options(group.map(trip => [trip.id, trip.name]), current) + "</optgroup>" : ""
    ).join("");
  }

  function scope(id, all = false, extra = "") {
    const common = all ? options([["", "待規劃方案與共用項目"], ["~shared", "全家共用"]], id) : "";
    return '<div class="scope"><label for="scope">方案範圍<select id="scope">' + common + groupedTrips(id) + "</select></label>" + extra + "</div>";
  }

  const noPlan = (title, glyph) => heading(title) + empty(glyph, "請先新增旅遊方案", "建立方案後即可開始安排。", add("trips"));

  function itinerary() {
    const id = selectedScope();
    if (!id) return noPlan("行程草案", "route");
    const trip = find("trips", id);
    const ordered = M.order(related("itinerary", id), itinerarySort);
    const kinds = [...new Set(ordered.map(item => item.activity).filter(Boolean))];
    const visible = ordered.filter(item => !itineraryActivity || item.activity === itineraryActivity);
    const days = groupDays(visible);
    const fields = '<label>活動類型' + select("itinerary-filter", "行程活動類型", [["", "所有活動"], ...kinds.map(value => [value, value])], itineraryActivity) +
      '</label><label>行程排序' + select("itinerary-sort", "行程排序", [["manual", "自訂順序"], ["time", "依當地時間"]], itinerarySort) + "</label>";
    const save = itinerarySort === "time" && ordered.length ?
      button("儲存為自訂順序", { action: "time-order", glyph: "check", attr: { "data-trip": id } }) : "";
    const cards = [...days].map(([day, entries]) => {
      const actual = M.travelDate(trip.startDate, day);
      const outOfRange = actual && trip.endDate && actual > trip.endDate ? pill("晚於預計回程日", "warm") : "";
      const rows = entries.map((item, index) => {
        const move = direction => button(direction < 0 ? "往上移動" : "往下移動", {
          glyph: direction < 0 ? "up" : "down", action: "move", only: true,
          attr: { "data-id": item.id, "data-direction": direction, disabled: direction < 0 ? index === 0 : index === entries.length - 1 }
        });
        const controls = itinerarySort === "manual" && !itineraryActivity ? move(-1) + move(1) : "";
        return '<li><span class="timeline-time">' + h(item.time || "時間待定") + "</span><div><h3>" + h(item.title) +
          "</h3>" + meta(item.place) + '<div class="meta-line">' + (item.activity ? '<span class="tag">' + h(item.activity) + "</span>" : "") +
          verified(item) + sourceLink(item.url) + "</div>" + note(item.notes) + "</div>" + entryActions("itinerary", item, controls) + "</li>";
      }).join("");
      return panel("第 " + day + " 天" + (actual ? "　" + date(actual) : ""), outOfRange + '<ol class="timeline">' + rows + "</ol>",
        { glyph: "calendar", actions: add("itinerary", id, "subtle", day) });
    }).join("");
    return heading("行程草案", "同一天的活動可用上下箭頭調整順序。", add("itinerary", id)) + scope(id, false, fields) +
      '<div class="scope">' + badge(trip) + '<span class="small">' + h(tripDates(trip) + "，" + visible.length + " 項活動") + "</span>" + save + "</div>" +
      (cards || empty("route", itineraryActivity ? "沒有符合的活動" : "尚無行程", itineraryActivity ? "可切換活動類型。" : "填上天數、時間與地點即可開始。"));
  }

  function groupDays(items) {
    const days = new Map();
    for (const item of items) {
      if (!days.has(item.day)) days.set(item.day, []);
      days.get(item.day).push(item);
    }
    return days;
  }

  function bookings() {
    const id = selectedScope();
    if (!id) return noPlan("航班與住宿", "flight");
    const sections = [
      {
        key: "flights", glyph: "flight", headings: ["航空公司或班次", "航線與時間", "全家總價", "狀態", "操作"],
        hint: "填入班次、機場、總價與查證日期。",
        details: item => h([item.origin, item.arrival].filter(Boolean).join(" → ") || "航線待填") +
          meta(item.departs && "去程 " + date(item.departs)) + meta(item.returns && "回程 " + date(item.returns))
      },
      {
        key: "stays", glyph: "bed", headings: ["住宿名稱", "區域與日期", "全家總價", "狀態", "操作"],
        hint: "填入住宿名稱、入住日期、房型與全家總價。",
        details: item => h(item.area || "區域待填") + meta(dateRange(item.checkIn, item.checkOut)) + meta(item.room)
      }
    ];
    return heading("航班與住宿", "保留有興趣的選項、來源網址及查證日期。") + scope(id) +
      sections.map(({ key, glyph, headings, hint, details }) => {
        const rows = related(key, id).map(item => [
          h(item.title) + "<br>" + sourceLink(item.url) + note(item.notes),
          details(item), amountText(item.amount) + meta(item.checkedDate && "查證於 " + date(item.checkedDate)),
          actions(pill(M.bookingStatus[item.status], item.status === "booked" ? "good" : item.status === "short" ? "blue" : "neutral"), verified(item)),
          entryActions(key, item)
        ]);
        const label = titleOf(key);
        return panel(label, rows.length ? table(label, headings, rows) : empty(glyph, "尚無" + label, hint), { glyph, actions: add(key, id) });
      }).join("");
  }

  function budget() {
    const id = selectedScope();
    if (!id) return noPlan("預算與分攤", "wallet");
    const trip = find("trips", id);
    const planned = related("budgetItems", id);
    const expenses = related("expenses", id);
    const estimated = M.sum(planned);
    const spent = M.sum(expenses);
    const confirmed = expenses.filter(item => item.confirmed).length;
    const { rows: balances, transfers } = M.split(state.members, expenses);
    const difference = spent === null || trip.budgetLimit === null ? null : trip.budgetLimit - spent;
    const progress = spent !== null && trip.budgetLimit > 0 ?
      '<div class="budget-track' + (difference < 0 ? " over" : "") + '" role="img" aria-label="' +
      h("已記錄支出 " + money(spent) + "，預算上限 " + money(trip.budgetLimit)) +
      '"><span style="width:' + Math.min(100, 100 * spent / trip.budgetLimit) + '%"></span></div>' : "";
    const overview = '<div class="stats budget-stats">' + stat("全家預算上限", money(trip.budgetLimit), "wallet", "green") +
      stat("預算項目合計", money(estimated), "list", "blue") + stat("已記錄支出", money(spent), "done", "warm") + "</div>" +
      progress + (difference === null ? "" : '<div class="scope">' + info(difference < 0 ? "已記錄支出超出上限 " + money(-difference) + "。" :
        "預算上限扣除已記錄支出後剩餘 " + money(difference) + "。") + "</div>");
    const budgetRows = planned.map(item => [
      h(item.title) + note(item.notes), h(M.categories[item.category]), amountText(item.amount), verified(item), entryActions("budgetItems", item)
    ]);
    const expenseRows = expenses.map(item => [
      h(item.title) + meta(M.categories[item.category]) + note(item.notes), amountText(item.amount) + meta(item.date && date(item.date)),
      h(memberName(item.paidBy)) + meta("分攤成員 " + item.shareWith.map(memberName).join("，")), verified(item), entryActions("expenses", item)
    ]);
    const balanceRows = balances.map(row => [
      h(row.name), amountText(row.paid), amountText(row.share),
      h(row.net > 0 ? "應收 " + money(row.net) : row.net < 0 ? "應付 " + money(-row.net) : "已平衡")
    ]);
    const payOrder = transfers.length ? '<ol class="list-plain" aria-label="建議轉付">' + transfers.map(item => "<li>" +
      h(item.from + " 付給 " + item.to) + " " + amountText(item.amount) + "</li>").join("") + "</ol>" :
      '<p class="small">目前各成員已平衡。</p>';
    return heading("預算與分攤", "以新臺幣記錄旅費上限、預估費用與實際代墊。", edit("trips", trip)) + scope(id) + overview +
      panel("預算項目", planned.length ? table("預算項目", ["項目", "分類", "預估金額", "確認狀態", "操作"], budgetRows) :
        empty("wallet", "尚無預算項目", "可依機票、住宿、交通與餐飲逐項估算。"), { glyph: "wallet", actions: add("budgetItems", id) }) +
      panel("支出紀錄", expenses.length ? table("支出紀錄", ["項目", "實付金額", "代墊與分攤", "確認狀態", "操作"], expenseRows) :
        empty("list", "尚無支出紀錄", "新增付款後，選出代墊人與參與分攤的成員。"),
        { glyph: "list", actions: state.members.length ? add("expenses", id) : linkTo("新增家庭成員", "family", "", "users", "primary") }) +
      panel("分攤結果", confirmed ? table("各成員分攤結果", ["成員", "已代墊", "應分攤", "結算"], balanceRows) + payOrder :
        empty("users", "等待確認支出", "確認付款及分攤名單後，工作台會自動計算。"), {
        glyph: "users", sub: "已確認支出由參與者均分，末位的整元差額依分攤名單的順序分配。已計入 " + confirmed + " 筆。"
      });
  }

  function today() {
    const parts = new Map(new Intl.DateTimeFormat("en", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts()
      .map(part => [part.type, part.value]));
    return parts.get("year") + "-" + parts.get("month") + "-" + parts.get("day");
  }

  function inScope(item, id) {
    if (id === "~shared") return !item.tripId;
    if (id) return item.tripId === id;
    return !item.tripId || find("trips", item.tripId)?.status !== "completed";
  }

  function tasksPage() {
    const id = selectedScope(true);
    const dateNow = today();
    const defaultTrip = id === "~shared" ? "" : id;
    const tasks = state.tasks.filter(item => inScope(item, id) && (!taskFilter || (taskFilter === "open" ? pending(item) : item.status === taskFilter)));
    tasks.sort((a, b) => Number(pending(b)) - Number(pending(a)) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    const taskRows = tasks.map(item => {
      const open = pending(item);
      const toggle = "<button" + attrs({
        type: "button", class: "task-toggle", "data-action": "task", "data-id": item.id,
        "aria-pressed": String(!open), "aria-label": (open ? "完成待辦" : "重新開啟待辦") + "「" + item.title + "」"
      }) + ">" + (open ? "" : icon("check")) + "</button>";
      return [
        toggle + h(item.title) + note(item.notes),
        h(tripName(item.tripId)) + meta(item.memberId && memberName(item.memberId)),
        h(date(item.dueDate)) + (open && item.dueDate && item.dueDate < dateNow ? " " + pill("已逾期", "warm") : ""),
        pill(M.taskStatus[item.status], open ? item.status === "doing" ? "blue" : "warm" : "good"),
        entryActions("tasks", item)
      ];
    });
    const documentRows = state.documents.filter(item => inScope(item, id)).map(item => [
      h(item.title) + meta(M.documentTypes[item.type]) + note(item.notes),
      h(tripName(item.tripId)) + meta(item.memberId && memberName(item.memberId)),
      h(date(item.expiry)) + (item.expiry && item.expiry < dateNow ? " " + pill("已過期", "warm") : ""),
      h(item.location || "待填") + meta(item.checkedDate && "查證於 " + date(item.checkedDate)),
      actions(pill(M.documentStatus[item.status], item.status === "ready" ? "good" : "neutral"), verified(item)),
      entryActions("documents", item)
    ]);
    const filter = '<label>待辦進度' + select("task-filter", "待辦進度",
      [["", "所有進度"], ["open", "尚未完成"], ...Object.entries(M.taskStatus)], taskFilter) + "</label>";
    return heading("待辦與文件", "指定負責成員，追蹤進度和文件有效期限。") + scope(id, true, filter) +
      panel("待辦清單", taskRows.length ? table("待辦清單", ["待辦", "方案與負責人", "截止日", "進度", "操作"], taskRows) :
        empty("list", "目前沒有符合的待辦", "可切換範圍或新增待辦。"), { glyph: "list", actions: add("tasks", defaultTrip) }) +
      panel("重要文件", documentRows.length ? table("重要文件", ["文件", "方案與成員", "有效期限", "存放位置", "狀態", "操作"], documentRows) :
        empty("document", "尚無重要文件紀錄", "填入文件名稱、有效期限與存放位置即可。"), {
        glyph: "document", actions: add("documents", defaultTrip), sub: "護照號碼及掃描檔請保存在家人信任的私人空間。"
      });
  }

  function family() {
    return heading("家庭偏好", "記下家人的興趣、飲食與行動需求，評分時一起參考。", add("members")) +
      (state.members.length ? '<div class="columns">' + state.members.map(item => {
        const entries = M.collections.members.fields.filter(field => field.key !== "name" && item[field.key]).map(field =>
          "<div><dt>" + h(field.label) + "</dt><dd>" + h(item[field.key]) + "</dd></div>");
        return panel(item.name, entries.length ? "<dl>" + entries.join("") + "</dl>" : '<p class="small">偏好待填。</p>', {
          glyph: "users", extra: "member-card", actions: entryActions("members", item)
        });
      }).join("") + "</div>" : empty("users", "尚無家庭成員", "新增成員後即可指定待辦負責人與費用分攤人。"));
  }

  function archive() {
    const items = archived();
    return heading("已完成旅程", "回看完成的旅行。需要重新安排時，可移回規劃。") +
      (items.length ? '<div class="archive-list">' + items.map(trip =>
        '<article class="panel archive-row"><div class="archive-caption"><span class="stat-icon">' + icon("done") +
        '</span><div><h2>' + h(trip.name) + '</h2><p class="small break">' + h(trip.country + "，" + trip.destination + "　" + tripDates(trip)) +
        "</p></div></div>" + actions(badge(trip), linkTo("開啟旅程", "plan", trip.id, "arrow", "subtle"), archiveButton(trip)) + "</article>"
      ).join("") + "</div>" : empty("archive", "尚無已完成旅程", "打開一個方案後，按「標記已完成」即可歸檔。"));
  }

  function review() {
    const rows = reviewItems().map(({ key, item }) => [
      h(title(item)), h(titleOf(key)), h(key === "trips" ? item.destination : tripName(item.tripId)), verified(item),
      actions(edit(key, item, true), button("標記已確認", { action: "verify", glyph: "check", attr: { "data-key": key, "data-id": item.id } }))
    ]);
    return heading("待確認資料", "核對日期、報價、草案與文件後，可標記為已確認。") +
      panel("待確認清單", rows.length ? table("待確認清單", ["資料", "類型", "範圍", "狀態", "操作"], rows) :
        empty("done", "目前沒有待確認資料", "新增未確認的紀錄後，會顯示在這裡。"), { glyph: "flag" });
  }

  function dataPage() {
    const fileActions = '<div class="actions data-actions">' + button("匯出備份", { action: "export", glyph: "download", variant: "primary" }) +
      button("匯入 JSON", { action: "import", glyph: "upload" }) +
      button("下載空白範本", { href: "./data/template.json", glyph: "document", attr: { download: "family-travel-template.json" } }) + "</div>";
    const guide = '<ol class="list-plain">' +
      '<li>在「規劃總覽」新增或編輯方案，填入預計日期、預算上限與活動類型。</li>' +
      '<li>在「方案比較」勾選候選方案。可調整權重，各項評分填 1 至 5 分。</li>' +
      '<li>從方案頁安排每天的活動、加入航班與住宿候選，並記錄預算與實付費用。</li>' +
      '<li>在「待辦與文件」可選全家共用或指定方案。資訊核對後可標記已確認。旅程結束後可在方案頁歸檔。</li>' +
      '<li>換裝置時，在舊裝置匯出 JSON，再到新裝置匯入。清除瀏覽器的網站資料前請先備份。</li></ol>';
    return heading("資料與使用說明", "管理目前瀏覽器的資料，或轉移到另一台裝置。") +
      panel("備份與還原", fileActions + info("匯入會先檢查格式和資料連結，再顯示筆數供你確認。確認後會整份替換目前瀏覽器的工作台資料。"), { glyph: "archive" }) +
      panel("使用方式", guide, { glyph: "help" }) +
      panel("GitHub Pages 部署", '<p>解壓縮部署包，把檔案放到儲存庫根目錄。到 GitHub 的 <strong>Settings → Pages</strong>，指定從 <strong>main</strong> 的 <strong>/(root)</strong> 發布。</p><div class="actions">' +
        '<a class="help-link" href="./README.md" target="_blank" rel="noopener">部署與操作說明</a>' +
        '<a class="help-link" href="./data/schema.json" target="_blank" rel="noopener">JSON 欄位定義</a></div>', { glyph: "document" });
  }

  function editorField(field, value) {
    const { key, label, kind, required, wide, min, max, placeholder } = field;
    const id = "field-" + key;
    const wrapper = "field" + (wide ? " field-wide" : "");
    const caption = h(label) + (required ? ' <span aria-hidden="true">*</span>' : "");
    if (kind === "check") {
      return '<div class="' + wrapper + ' field-check"><label><input' + attrs({ type: "checkbox", name: key, checked: value }) +
        ">" + caption + "</label></div>";
    }
    if (kind === "members") {
      return '<fieldset class="' + wrapper + '"><legend>' + caption + "</legend>" + actions(...state.members.map(item =>
        '<label class="check-chip"><input' + attrs({ type: "checkbox", name: key, value: item.id, checked: value.includes(item.id) }) +
        ">" + h(item.name) + "</label>")) + "</fieldset>";
    }
    const properties = { id, name: key, required, placeholder };
    let input;
    if (kind === "select" || kind === "trip" || kind === "member") {
      let entries;
      if (kind === "select") entries = options(Object.entries(field.choices), value);
      if (kind === "trip") entries = option("", required ? "請選擇方案" : "全家共用", value) + groupedTrips(value);
      if (kind === "member") entries = options([["", required ? "請選擇成員" : "未指定"], ...state.members.map(item => [item.id, item.name])], value);
      input = "<select" + attrs(properties) + ">" + entries + "</select>";
    } else if (kind === "memo") {
      input = "<textarea" + attrs({ ...properties, rows: 3, maxlength: max ?? 4000 }) + ">" + h(value) + "</textarea>";
    } else {
      const type = kind === "tags" ? "text" : kind;
      input = "<input" + attrs({
        ...properties, type, min, max: kind === "number" ? max : undefined, step: kind === "number" ? 1 : undefined,
        maxlength: kind === "tags" ? 3100 : ["text", "url"].includes(kind) ? (max ?? 180) : undefined,
        value: kind === "tags" ? value.join("，") : value ?? ""
      }) + ">";
    }
    return '<div class="' + wrapper + '"><label for="' + id + '">' + caption + "</label>" + input + "</div>";
  }

  function modal(label, content, callback, { submit = "儲存", variant = "primary", confirmation = false } = {}) {
    if (dialog.open) return;
    onSubmit = callback;
    $("dialog-title").textContent = label;
    $("fields").innerHTML = content;
    $("fields").scrollTop = 0;
    $("error").hidden = true;
    $("submit").textContent = submit;
    $("submit").className = "button " + variant;
    dialog.showModal();
    const target = confirmation ? dialog.querySelector(".dialog-footer [data-action=close]") :
      $("fields").querySelector("input, select, textarea");
    target?.focus({ preventScroll: true });
  }

  function decide(label, message, callback, submit, variant = "primary") {
    modal(label, '<p class="field-wide dialog-message">' + h(message) + "</p>", callback, { submit, variant, confirmation: true });
  }

  function readField(form, field, previous) {
    if (field.kind === "check") return form.has(field.key);
    if (field.kind === "members") {
      const ids = form.getAll(field.key);
      const kept = (previous?.[field.key] ?? []).filter(id => ids.includes(id));
      return [...new Set([...kept, ...ids])];
    }
    const value = String(form.get(field.key) ?? "").trim();
    if (field.kind === "number") return value === "" ? null : Number(value);
    if (field.kind === "tags") return [...new Set(value.split(/[，,、]/).map(tag => tag.trim()).filter(Boolean))];
    return value;
  }

  function uniqueId(key) {
    if (globalThis.crypto?.randomUUID) return key + "-" + crypto.randomUUID();
    const random = crypto.getRandomValues(new Uint32Array(4));
    return key + "-" + [...random].map(n => n.toString(16)).join("-");
  }

  function upsert(key, record) {
    const exists = state[key].some(item => item.id === record.id);
    const rows = exists ? state[key].map(item => item.id === record.id ? record : item) : [...state[key], record];
    store({ ...state, [key]: rows });
  }

  function editItem(key, id = "", trip = "", day = 1) {
    if (!Object.hasOwn(M.collections, key)) return;
    const previous = id ? find(key, id) : null;
    if (id && !previous) return;
    const { title, fields } = M.collections[key];
    const content = fields.map(field => {
      let value = previous ? previous[field.key] : M.defaultValue(field);
      if (!previous && field.key === "tripId") value = trip;
      if (!previous && field.key === "day") value = day;
      return editorField(field, value);
    }).join("");
    modal((previous ? "編輯" : "新增") + title, content, form => {
      const record = { ...previous, id: previous?.id ?? uniqueId(key) };
      for (const field of fields) record[field.key] = readField(form, field, previous);
      if (key === "trips" && record.status === "completed" && previous?.status !== "completed") {
        record.previousStatus = previous?.status ?? "planning";
      }
      if (key === "itinerary" && (!previous || record.tripId !== previous.tripId || record.day !== previous.day)) {
        const others = M.order(related("itinerary", record.tripId).filter(item => item.day === record.day));
        const sequence = new Map(others.map((item, i) => [item.id, i]));
        record.order = others.length;
        const revised = state.itinerary.filter(item => item.id !== record.id).map(item =>
          sequence.has(item.id) ? { ...item, order: sequence.get(item.id) } : item);
        store({ ...state, itinerary: [...revised, record] });
      } else {
        upsert(key, record);
      }
      return (previous ? "已更新" : "已新增") + title;
    });
  }

  function editRating(id) {
    const trip = find("trips", id);
    if (!trip) return;
    const choices = { "": "待評", 1: "1 分", 2: "2 分", 3: "3 分", 4: "4 分", 5: "5 分" };
    const fields = Object.entries(M.criteria).map(([key, label]) => editorField(M.field(key, label, "select", { choices }),
      trip.ratings[key] === null ? "" : String(trip.ratings[key]))).join("");
    modal(trip.name + "評分", fields + '<p class="small field-wide">各項給 1 至 5 分。尚未掌握的項目可保留待評。</p>', form => {
      const ratings = Object.fromEntries(Object.keys(M.criteria).map(key => [key, form.get(key) === "" ? null : Number(form.get(key))]));
      upsert("trips", { ...trip, ratings });
      return "已更新方案評分";
    });
  }

  function editWeights() {
    const fields = Object.entries(M.criteria).map(([key, label]) =>
      editorField(M.field(key, label, "number", { min: 0, max: 100, required: true }), state.weights[key])).join("");
    modal("調整評分權重", fields + '<p class="small field-wide">每項可填 0 至 100，至少一項大於 0。工作台會換算各項佔比。</p>', form => {
      const weights = Object.fromEntries(Object.keys(M.criteria).map(key => [key, Number(form.get(key))]));
      store({ ...state, weights });
      return "已更新比較權重";
    });
  }

  function chooseRange(kind) {
    const isDate = kind === "date";
    const limits = { min: 0, max: M.maxAmount };
    const fields = isDate ? [M.field("from", "篩選起日", "date"), M.field("to", "篩選迄日", "date")] :
      [M.field("min", "最低預算（NT$）", "number", limits), M.field("max", "最高預算（NT$）", "number", limits)];
    const markup = fields.map(field => editorField(field, filters[field.key])).join("");
    const helper = isDate ? "會顯示預計日期與區間有重疊的方案。" :
      "依方案的預算上限篩選，上限空白時採預算項目合計。";
    modal(isDate ? "設定日期區間" : "設定預算範圍", markup + '<p class="small field-wide">' + helper + "</p>", form => {
      const [start, end] = fields.map(field => readField(form, field));
      if ((isDate && !start && !end) || (!isDate && start === null && end === null)) {
        throw new Error(isDate ? "請輸入篩選起日或迄日。" : "請輸入最低或最高預算。");
      }
      if ((isDate && start && end && start > end) || (!isDate && start !== null && end !== null && start > end)) {
        throw new Error(isDate ? "篩選迄日須等於或晚於起日。" : "最高預算須等於或高於最低預算。");
      }
      filters = { ...filters, [kind]: "range", [fields[0].key]: start, [fields[1].key]: end };
    }, { submit: "套用篩選" });
  }

  function deleteItem(key, id) {
    if (!Object.hasOwn(M.collections, key)) return;
    const record = find(key, id);
    if (!record) return;
    if (key === "members") {
      const references = [...state.expenses, ...state.tasks, ...state.documents]
        .filter(item => item.memberId === id || item.paidBy === id || item.shareWith?.includes(id));
      if (references.length) {
        announce("這位家人仍連到 " + references.length + " 筆紀錄。請先在對應的支出、待辦或文件改選成員。", true);
        return;
      }
    }
    const childKeys = Object.keys(M.collections).filter(key => key !== "trips");
    const counts = key === "trips" ? childKeys.reduce((sum, section) => sum + related(section, id).length, 0) : 0;
    const message = "確定刪除「" + title(record) + "」？" + (counts ? " 附屬的 " + counts + " 筆紀錄也會一併移除。" : "");
    decide("刪除" + titleOf(key), message, () => {
      const next = { ...state, [key]: state[key].filter(item => item.id !== id) };
      if (key === "trips") childKeys.forEach(section => { next[section] = next[section].filter(item => item.tripId !== id); });
      store(next);
      if (key === "trips" && route.id === id) location.hash = href(record.status === "completed" ? "archive" : "overview");
      return "已刪除" + titleOf(key);
    }, "刪除", "danger");
  }

  function markArchive(id) {
    const trip = find("trips", id);
    if (!trip) return;
    const done = trip.status === "completed";
    upsert("trips", { ...trip, status: done ? trip.previousStatus : "completed", previousStatus: done ? trip.previousStatus : trip.status });
    render();
    savedMessage(done ? "已移回待規劃方案" : "已標記完成並歸檔");
  }

  function markTask(id) {
    const task = find("tasks", id);
    if (!task) return;
    upsert("tasks", { ...task, status: pending(task) ? "done" : "todo" });
    render();
    savedMessage(pending(task) ? "已完成待辦" : "已重新開啟待辦");
  }

  function markVerified(key, id) {
    if (!verificationKeys.includes(key)) return;
    const record = find(key, id);
    if (!record) return;
    upsert(key, { ...record, confirmed: true });
    render();
    savedMessage("已確認資料");
  }

  function saveOrder(items) {
    const sequence = new Map();
    for (const days of groupDays(items).values()) days.forEach((item, index) => sequence.set(item.id, index));
    store({ ...state, itinerary: state.itinerary.map(item => sequence.has(item.id) ? { ...item, order: sequence.get(item.id) } : item) });
  }

  function move(id, direction) {
    const item = find("itinerary", id);
    if (!item || ![-1, 1].includes(direction)) return;
    const items = M.order(related("itinerary", item.tripId).filter(record => record.day === item.day));
    const from = items.findIndex(record => record.id === id);
    const to = from + direction;
    if (to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
    saveOrder(items);
    render();
    workspace.querySelector('[data-action="move"][data-id="' + id + '"]:not([disabled])')?.focus({ preventScroll: true });
    savedMessage("已更新行程順序");
  }

  function applyTimeOrder(id) {
    saveOrder(M.order(related("itinerary", id), "time"));
    itinerarySort = "manual";
    render();
    savedMessage("已儲存時間順序");
  }

  function exportBackup() {
    const payload = { ...state, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const download = document.createElement("a");
    download.href = url;
    download.download = "family-travel-backup-" + today() + ".json";
    document.body.append(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    announce("已產生 JSON 備份。");
  }

  async function previewImport() {
    const [file] = fileInput.files;
    fileInput.value = "";
    if (!file) return;
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error("檔案超過工作台可匯入的大小。");
      const text = (await file.text()).replace(/^\uFEFF/, "");
      let payload;
      try { payload = JSON.parse(text); } catch { throw new Error("檔案須為有效的 JSON 格式。"); }
      const imported = M.validate(payload);
      const complete = imported.trips.filter(trip => trip.status === "completed").length;
      const count = key => imported[key].length;
      const preview = file.name + "\n\n" +
        (count("trips") - complete) + " 個待規劃方案，" + complete + " 個已完成旅程，" + count("members") + " 位家庭成員\n" +
        count("itinerary") + " 項行程，" + (count("flights") + count("stays")) + " 筆航班與住宿\n" +
        (count("budgetItems") + count("expenses")) + " 筆預算與支出，" + (count("tasks") + count("documents")) + " 筆待辦與文件\n\n" +
        "確認後，會替換目前瀏覽器的旅遊資料。請先保留現有備份。";
      decide("匯入旅遊資料", preview, () => {
        store(imported, true);
        filters = { ...initialFilters };
        compareIds = null;
        itineraryActivity = "";
        taskFilter = "";
        if (route.id && route.id !== "~shared" && !find("trips", route.id)) location.hash = "#overview";
        return "已匯入旅遊資料";
      }, "確認匯入");
    } catch (error) {
      announce(error.message, true);
    }
  }

  function toggleMenu(open) {
    open = open && matchMedia("(max-width: 825px)").matches;
    $("sidebar").classList.toggle("open", open);
    $("backdrop").hidden = !open;
    $("menu").setAttribute("aria-expanded", String(open));
    document.querySelector(".frame").inert = open;
    if (open) ($("navigation").querySelector('[aria-current="page"]') || $("navigation").querySelector("a"))?.focus();
  }

  function click(event) {
    const anchor = event.target.closest("a");
    if (anchor?.classList.contains("skip-link")) {
      event.preventDefault();
      workspace.focus();
      return;
    }
    if (anchor && $("sidebar").contains(anchor)) toggleMenu(false);
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    const { action, key, id, trip, day, direction } = trigger.dataset;
    try {
      switch (action) {
        case "edit": editItem(key, id, trip, Number(day || 1)); break;
        case "delete": deleteItem(key, id); break;
        case "archive": markArchive(id); break;
        case "task": markTask(id); break;
        case "verify": markVerified(key, id); break;
        case "clear-filters": filters = { ...initialFilters }; render(); break;
        case "rating": editRating(id); break;
        case "weight": editWeights(); break;
        case "move": move(id, Number(direction)); break;
        case "time-order": applyTimeOrder(trip); break;
        case "close": dialog.close(); break;
        case "export": exportBackup(); break;
        case "import": fileInput.click(); break;
      }
    } catch (error) {
      announce(error.message, true);
    }
  }

  function change(event) {
    const element = event.target;
    const { filter, pick } = element.dataset;
    if (filter) {
      if (["date", "budget"].includes(filter) && ["range", "adjust"].includes(element.value)) {
        element.value = filters[filter];
        chooseRange(filter);
        return;
      }
      filters[filter] = element.value;
      if (filter === "date") Object.assign(filters, { from: "", to: "" });
      if (filter === "budget") Object.assign(filters, { min: null, max: null });
    } else if (pick) {
      compareIds ??= new Set(active().map(item => item.id));
      if (element.checked) compareIds.add(pick);
      else compareIds.delete(pick);
    } else if (element.id === "scope") {
      location.hash = href(route.page, element.value);
      return;
    } else {
      switch (element.id) {
        case "compare-sort": compareSort = element.value; break;
        case "itinerary-sort": itinerarySort = element.value; break;
        case "itinerary-filter": itineraryActivity = element.value; break;
        case "task-filter": taskFilter = element.value; break;
        default: return;
      }
    }
    render(false, true);
  }

  const pages = {
    overview, compare, plan: planPage, itinerary, bookings, budget,
    tasks: tasksPage, family, archive, review, data: dataPage
  };
  load();
  $("brand-icon").innerHTML = icon("compass");
  $("menu").innerHTML = icon("menu");
  $("close-dialog").innerHTML = icon("close");
  $("export").innerHTML = icon("download") + "匯出備份";
  $("menu").addEventListener("click", () => toggleMenu(!$("sidebar").classList.contains("open")));
  $("backdrop").addEventListener("click", () => { toggleMenu(false); $("menu").focus(); });
  matchMedia("(max-width: 825px)").addEventListener("change", () => toggleMenu(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("sidebar").classList.contains("open")) {
      toggleMenu(false);
      $("menu").focus();
    }
  });
  document.addEventListener("click", click);
  workspace.addEventListener("change", change);
  editor.addEventListener("submit", event => {
    event.preventDefault();
    if (!dialog.open || !onSubmit) return;
    try {
      const message = onSubmit(new FormData(editor));
      dialog.close();
      render();
      if (message) savedMessage(message);
    } catch (error) {
      $("error").textContent = error.message;
      $("error").hidden = false;
    }
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    onSubmit = null;
    synchronize();
  });
  fileInput.addEventListener("change", previewImport);
  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) synchronize();
  });
  function navigate() {
    const next = routeFromHash();
    if (route.page !== next.page || route.id !== next.id) itineraryActivity = "";
    route = next;
    toggleMenu(false);
    render(location.hash !== "#plans");
    if (location.hash === "#plans") $("plans")?.scrollIntoView();
  }
  window.addEventListener("hashchange", navigate);
  route = routeFromHash();
  render();
  if (location.hash === "#plans") requestAnimationFrame(() => $("plans")?.scrollIntoView());
})();

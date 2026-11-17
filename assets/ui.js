(() => {
  "use strict";
  const paths = {
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    compare: '<path d="M4 19h16M6 15v-4m6 4V5m6 10V8"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
    flight: '<path d="M17 21v-8l4-4c1.5-1.5 1-3.5-.5-4s-2.5.5-3.5 1.5l-3.5 3.5L5 7l-2 2 6 4-3 3H3l-1 2 4 1 2 3 2-1v-3l3-3 2 7 2-1z"/>',
    bed: '<path d="M3 18v-7m18 7v-7M3 16h18M5 11V6h14v5M3 15v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M8 11V9h3m2 2V9h3"/>',
    wallet: '<path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14a2 2 0 0 1 2 2v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7"/><path d="M22 13h-5a1 1 0 0 0 0 2h5"/>',
    list: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 11l1.5 1.5L12 10m2 2h2m-8 5h8"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-2-3.5"/><circle cx="10" cy="8" r="3.5"/><path d="M16 5a3.5 3.5 0 0 1 0 7"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8m-9 4h4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1.4 1.3-1.9 1.5-1.9 2.9m0 3H12"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    pin: '<path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
    filter: '<path d="M4 6h16m-13 6h10m-7 6h4"/>',
    tags: '<path d="M3 4h7l10 10-6 6L4 10 3 4z"/><circle cx="7.5" cy="7.5" r="1"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5L19 7"/>',
    done: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    edit: '<path d="m14 5 5 5m-2.5-7.5 5 5L9 20l-6 1 1-6z"/>',
    trash: '<path d="M4 7h16m-13 0 1 13h8l1-13m-7 3v6m4-6v6M9 7V4h6v3"/>',
    up: '<path d="m6 14 6-6 6 6"/>',
    down: '<path d="m6 10 6 6 6-6"/>',
    external: '<path d="M13 4h7v7m0-7-9 9m6-1v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h6"/>',
    document: '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"/><path d="M13 3v7h7M8 14h8m-8 3h5"/>',
    sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="17" r="2" fill="currentColor"/>',
    flag: '<path d="M5 21V5m0 1c5-5 9 4 14-1v10c-6 5-9-4-14 1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>'
  };
  function icon(name, extra = "") {
    return '<svg class="icon ' + extra + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] ?? "") + "</svg>";
  }
  const h = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
  const attrs = values => Object.entries(values).filter(([, value]) => value !== false && value != null)
    .map(([key, value]) => " " + key + (value === true ? "" : '="' + h(value) + '"')).join("");
  function button(label, settings = {}) {
    const { href, action, glyph, variant = "subtle", only, attr = {} } = settings;
    const tag = href ? "a" : "button";
    const values = {
      class: "button " + variant + (only ? " icon-button" : ""),
      ...(href ? { href } : { type: "button" }), "data-action": action,
      ...(only ? { "aria-label": label, title: label } : {}), ...attr
    };
    return "<" + tag + attrs(values) + ">" + (glyph ? icon(glyph) : "") + (only ? "" : h(label)) + "</" + tag + ">";
  }
  const pill = (label, tone = "neutral") => '<span class="pill ' + tone + '">' + h(label) + "</span>";
  const tags = values => '<div class="tags">' + values.map(value => '<span class="tag">' + h(value) + "</span>").join("") + "</div>";
  const option = (value, label, current) => '<option' + attrs({ value, selected: current === value }) + ">" + h(label) + "</option>";
  const options = (entries, current) => entries.map(([value, label]) => option(value, label, current)).join("");
  const select = (id, label, entries, current, extra = {}) => "<select" + attrs({ id, "aria-label": label, ...extra }) + ">" + options(entries, current) + "</select>";
  const date = value => value ? value.replaceAll("-", "/").replace("T", " ") : "待填";
  function dateRange(start, end, empty = "日期待定") {
    if (!start && !end) return empty;
    if (!start) return date(end) + " 回程";
    if (!end) return date(start) + " 出發";
    return start === end ? date(start) : date(start) + " 至 " + date(end);
  }
  const formatter = new Intl.NumberFormat("zh-TW");
  const money = value => value == null ? "待填" : "NT$" + formatter.format(value);
  const meta = value => value ? '<span class="meta">' + h(value) + "</span>" : "";
  const note = value => value ? '<p class="record-note">' + h(value) + "</p>" : "";
  const info = value => '<p class="info">' + icon("info") + "<span>" + h(value) + "</span></p>";
  function heading(title, description = "", actions = "") {
    return '<div class="page-heading"><div><h1 id="page-heading" tabindex="-1">' + h(title) + "</h1>" +
      (description ? "<p>" + h(description) + "</p>" : "") + '</div><div class="actions">' + actions + "</div></div>";
  }
  function panel(title, contents, settings = {}) {
    const { glyph, sub, actions = "", extra = "" } = settings;
    return '<section class="panel ' + extra + '"><header class="panel-heading"><div class="panel-title">' +
      (glyph ? icon(glyph) : "") + "<div><h2>" + h(title) + "</h2>" + (sub ? "<p>" + h(sub) + "</p>" : "") +
      "</div></div>" + actions + "</header>" + contents + "</section>";
  }
  function empty(glyph, title, hint, actions = "") {
    return '<div class="empty"><span>' + icon(glyph) + "</span><h3>" + h(title) +
      "</h3><p>" + h(hint) + "</p>" + actions + "</div>";
  }
  function table(label, headings, rows, extra = "") {
    return '<div class="table-wrap" tabindex="0" role="region" aria-label="' + h(label) +
      '"><table class="' + extra + '"><thead><tr>' +
      headings.map(title => '<th scope="col">' + title + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map(row => '<tr><th scope="row">' + row[0] + "</th>" + row.slice(1).map(cell => "<td>" + cell + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></div>";
  }
  globalThis.TravelUI = { icon, h, attrs, button, pill, tags, option, options, select, date, dateRange, money, meta, note, info, heading, panel, empty, table };
})();

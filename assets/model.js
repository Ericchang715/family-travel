(() => {
  "use strict";
  const tripStatus = { idea: "待規劃", planning: "準備中", ready: "準備完成", completed: "已完成" };
  const bookingStatus = { candidate: "候選", short: "優先考慮", booked: "已預訂" };
  const taskStatus = { todo: "待辦", doing: "進行中", done: "已完成" };
  const documentStatus = { needed: "待備妥", preparing: "準備中", ready: "已備妥" };
  const documentTypes = { passport: "護照", entry: "入境文件", tickets: "機票與憑證", booking: "住宿憑證", insurance: "旅遊保險", other: "其他" };
  const categories = { flights: "機票", stays: "住宿", transport: "當地交通", food: "餐飲", tickets: "門票與活動", insurance: "保險", shopping: "購物", reserve: "預備金", other: "其他" };
  const criteria = { budget: "預算符合度", dates: "日期便利度", family: "家人喜好", travel: "交通便利度" };
  const defaultWeights = { budget: 30, dates: 25, family: 30, travel: 15 };
  const artwork = { default: "山湖", hokkaido: "北海道", seoul: "首爾", germany: "德國", italy: "義大利" };
  const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
  const maxAmount = 999999999;
  const field = (key, label, kind = "text", args = {}) => ({ key, label, kind, ...args });
  const name = label => field("title", label, "text", { required: true, wide: true });
  const menu = (key, label, choices) => field(key, label, "select", { choices, default: Object.keys(choices)[0] });
  const amount = (key, label, required = false) => field(key, label, "number", { min: 0, max: maxAmount, required });
  const plan = (shared = false) => field("tripId", "所屬方案", "trip", { required: !shared });
  const member = (key, label, required = false) => field(key, label, "member", { required });
  const date = (key, label) => field(key, label, "date");
  const notes = field("notes", "備註", "memo", { wide: true, max: 4000 });
  const confirm = label => field("confirmed", label || "資料已確認", "check", { wide: true });
  const source = field("url", "來源網址", "url", { max: 2048, wide: true, placeholder: "https://" });
  const collections = {
    trips: { title: "方案", fields: [
      field("destination", "目的地", "text", { required: true }),
      field("country", "國家或地區", "text", { required: true }),
      field("name", "方案名稱", "text", { required: true, wide: true }),
      menu("status", "準備狀態", tripStatus), menu("artwork", "封面圖", artwork),
      date("startDate", "預計出發日"), date("endDate", "預計回程日"),
      amount("budgetLimit", "全家預算上限（NT$）"), field("dateNotes", "日期備註"),
      field("activities", "活動類型", "tags", { wide: true, placeholder: "例：自然景觀，美食" }),
      notes, confirm("方案基本資料已確認")
    ] },
    members: { title: "家庭成員", fields: [
      field("name", "稱呼", "text", { required: true }), field("interests", "想做的事"),
      field("priorities", "最在意的安排", "memo"), field("avoid", "想避開的安排", "memo"),
      field("needs", "飲食與行動需求", "memo", { wide: true }), notes
    ] },
    itinerary: { title: "行程項目", fields: [
      plan(), field("day", "第幾天", "number", { min: 1, max: 365, required: true, default: 1 }),
      name("活動名稱"), field("time", "當地時間", "time"), field("place", "地點"),
      field("activity", "活動類型"), confirm(), source, notes
    ] },
    flights: { title: "航班候選", fields: [
      plan(), menu("status", "候選狀態", bookingStatus), name("航空公司或班次"),
      field("origin", "出發機場"), field("arrival", "抵達機場"),
      field("departs", "去程起飛（當地時間）", "datetime-local"),
      field("returns", "回程起飛（當地時間）", "datetime-local"),
      amount("amount", "全家總價（NT$）"), date("checkedDate", "查證日期"),
      source, notes, confirm("航班與金額已確認")
    ] },
    stays: { title: "住宿候選", fields: [
      plan(), menu("status", "候選狀態", bookingStatus), name("住宿名稱"),
      field("area", "住宿區域"), field("room", "房型或房間數"),
      date("checkIn", "入住日"), date("checkOut", "退房日"),
      amount("amount", "全家總價（NT$）"), date("checkedDate", "查證日期"),
      source, notes, confirm("住宿與金額已確認")
    ] },
    budgetItems: { title: "預算項目", fields: [
      plan(), menu("category", "預算分類", categories), name("項目名稱"),
      amount("amount", "預估金額（NT$）", true), notes, confirm("金額已確認")
    ] },
    expenses: { title: "支出", fields: [
      plan(), menu("category", "支出分類", categories), name("項目名稱"), amount("amount", "實付金額（NT$）", true), date("date", "付款日期"),
      member("paidBy", "代墊成員", true),
      field("shareWith", "參與分攤的成員", "members", { required: true, wide: true }),
      notes, confirm("付款與分攤名單已確認")
    ] },
    tasks: { title: "待辦", fields: [
      plan(true), menu("status", "進度", taskStatus), name("待辦名稱"),
      member("memberId", "負責成員"), date("dueDate", "截止日"), notes
    ] },
    documents: { title: "文件紀錄", fields: [
      plan(true), menu("type", "文件類型", documentTypes), name("文件名稱"),
      member("memberId", "適用成員"), date("expiry", "有效期限"),
      menu("status", "準備狀態", documentStatus), date("checkedDate", "查證日期"),
      field("location", "存放位置提示", "text", { wide: true, placeholder: "例：家裡的旅行資料夾" }),
      notes, confirm("文件資訊已確認")
    ] }
  };

  const ensure = (condition, message) => { if (!condition) throw new Error(message); };
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const isTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  function isDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
    const parsed = new Date(value + "T00:00:00Z");
    return !Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === value;
  }

  function safeURL(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  }

  function defaultValue(field) {
    if (field.default !== undefined) return field.default;
    if (field.kind === "number") return null;
    if (field.kind === "check") return false;
    if (["tags", "members"].includes(field.kind)) return [];
    return "";
  }

  function cleanField(field, input, context) {
    const value = input === undefined ? defaultValue(field) : input;
    const { kind, required } = field;
    const error = context + "的「" + field.label + "」格式有誤。";
    if (kind === "check") {
      ensure(typeof value === "boolean", error);
      return value;
    }
    if (kind === "number") {
      ensure(value === null ? !required : Number.isInteger(value) && value >= field.min && value <= field.max, error);
      return value;
    }
    if (kind === "tags" || kind === "members") {
      ensure(Array.isArray(value) && value.length <= 50 && (!required || value.length > 0), error);
      ensure(value.every(part => typeof part === "string" &&
        (kind === "members" ? idPattern.test(part) : part.trim().length > 0 && part.trim().length <= 60)), error);
      return [...new Set(value.map(part => part.trim()))];
    }
    ensure(typeof value === "string", error);
    const text = value.trim();
    ensure((text || !required) && text.length <= (field.max ?? (kind === "memo" ? 4000 : 180)), error);
    if (kind === "select") ensure(Object.hasOwn(field.choices, text), error);
    if (!text) return text;
    if (kind === "trip" || kind === "member") ensure(idPattern.test(text), error);
    if (kind === "date") ensure(isDate(text), error);
    if (kind === "time") ensure(isTime(text), error);
    if (kind === "datetime-local") ensure(text.length === 16 && text[10] === "T" && isDate(text.slice(0, 10)) && isTime(text.slice(11)), error);
    if (kind === "url") ensure(safeURL(text), error);
    return text;
  }

  function getWeights(source) {
    ensure(isObject(source), "權重格式有誤。");
    const entries = Object.keys(criteria).map(key => {
      const value = source[key];
      ensure(Number.isInteger(value) && value >= 0 && value <= 100, "每個權重須為 0 至 100 的整數。");
      return [key, value];
    });
    ensure(entries.some(([, weight]) => weight > 0), "請將至少一項權重設為大於 0。");
    return Object.fromEntries(entries);
  }

  function normalize(key, record, index) {
    const { title, fields } = collections[key];
    const context = "第 " + (index + 1) + " 筆" + title;
    ensure(isObject(record) && typeof record.id === "string" && idPattern.test(record.id), context + "缺少有效的識別碼。");
    const item = { id: record.id };
    for (const field of fields) item[field.key] = cleanField(field, record[field.key], context);
    if (key === "trips") {
      ensure(record.ratings === undefined || isObject(record.ratings), context + "的評分格式有誤。");
      item.ratings = Object.fromEntries(Object.keys(criteria).map(key => {
        const score = record.ratings?.[key] ?? null;
        ensure(score === null || (Number.isInteger(score) && score >= 1 && score <= 5), context + "的評分須為 1 至 5 分。");
        return [key, score];
      }));
      item.previousStatus = record.previousStatus ?? "planning";
      ensure(["idea", "planning", "ready"].includes(item.previousStatus), context + "的原規劃狀態有誤。");
      ensure(!item.startDate || !item.endDate || item.startDate <= item.endDate, context + "的回程日早於出發日。");
    }
    if (key === "stays") ensure(!item.checkIn || !item.checkOut || item.checkIn <= item.checkOut, context + "的退房日早於入住日。");
    if (key === "itinerary") {
      item.order = record.order ?? index;
      ensure(Number.isInteger(item.order) && item.order >= 0 && item.order <= 1000000, context + "的順序有誤。");
    }
    return item;
  }

  function validate(data) {
    ensure(isObject(data) && data.schemaVersion === 1, "請選擇資料版本為 1 的工作台 JSON。");
    const result = { schemaVersion: 1, weights: getWeights(data.weights === undefined ? defaultWeights : data.weights) };
    for (const key of Object.keys(collections)) {
      ensure(Array.isArray(data[key]) && data[key].length <= 3000, "「" + key + "」須為最多 3,000 筆的陣列。");
      result[key] = data[key].map((record, index) => normalize(key, record, index));
      ensure(new Set(result[key].map(item => item.id)).size === result[key].length, "「" + key + "」內有重複的識別碼。");
    }
    const trips = new Set(result.trips.map(item => item.id));
    const members = new Set(result.members.map(item => item.id));
    for (const [key, { title }] of Object.entries(collections)) {
      for (const item of result[key]) {
        const context = title + "「" + (item.title || item.name) + "」";
        ensure(!item.tripId || trips.has(item.tripId), context + "連到不存在的方案。");
        const ids = [item.memberId, item.paidBy, ...(item.shareWith ?? [])].filter(Boolean);
        ensure(ids.every(id => members.has(id)), context + "連到不存在的成員。");
      }
    }
    return result;
  }

  function score(ratings, weights) {
    const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
    if (entries.some(([key]) => ratings[key] == null) || entries.length === 0) return null;
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    const weighted = entries.reduce((sum, [key, weight]) => sum + weight * ratings[key], 0);
    return Math.round(weighted / (total * 5) * 1000) / 10;
  }

  function order(items, mode = "manual") {
    return [...items].sort((a, b) => a.day - b.day ||
      (mode === "time" ? (a.time || "24:00").localeCompare(b.time || "24:00") : 0) ||
      a.order - b.order);
  }

  function travelDate(start, day) {
    if (!start) return "";
    const date = new Date(start + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + day - 1);
    const derived = date.toISOString().slice(0, 10);
    return isDate(derived) ? derived : "";
  }

  function matches(trip, filters, budget, activityTypes) {
    if (filters.destination && filters.destination !== trip.destination) return false;
    if (filters.activity && !activityTypes.includes(filters.activity)) return false;
    if (filters.status && (filters.status === "unverified" ? trip.confirmed : filters.status !== trip.status)) return false;
    const start = trip.startDate || trip.endDate;
    const end = trip.endDate || trip.startDate;
    if (filters.date === "scheduled" && !start) return false;
    if (filters.date === "unscheduled" && start) return false;
    if (filters.date === "range" && (!start || (filters.from && end < filters.from) || (filters.to && start > filters.to))) return false;
    if (filters.budget === "missing") return budget === null;
    if (filters.budget === "low") return budget !== null && budget <= 50000;
    if (filters.budget === "mid") return budget !== null && budget > 50000 && budget <= 100000;
    if (filters.budget === "high") return budget !== null && budget > 100000;
    if (filters.budget === "range") return budget !== null && (filters.min == null || budget >= filters.min) && (filters.max == null || budget <= filters.max);
    return true;
  }

  function split(members, expenses) {
    const balances = new Map(members.map(({ id, name }) => [id, { id, name, paid: 0, share: 0 }]));
    for (const expense of expenses.filter(item => item.confirmed)) {
      balances.get(expense.paidBy).paid += expense.amount;
      const perPerson = Math.floor(expense.amount / expense.shareWith.length);
      const rest = expense.amount % expense.shareWith.length;
      expense.shareWith.forEach((id, index) => { balances.get(id).share += perPerson + (index < rest ? 1 : 0); });
    }
    const rows = [...balances.values()].map(row => ({ ...row, net: row.paid - row.share }));
    const due = rows.filter(row => row.net < 0).map(row => ({ ...row, amount: -row.net }));
    const owed = rows.filter(row => row.net > 0).map(row => ({ ...row, amount: row.net }));
    const transfers = [];
    let payer = 0;
    let recipient = 0;
    while (payer < due.length && recipient < owed.length) {
      const from = due[payer];
      const to = owed[recipient];
      const amount = Math.min(from.amount, to.amount);
      transfers.push({ from: from.name, to: to.name, amount });
      from.amount -= amount;
      to.amount -= amount;
      if (!from.amount) payer++;
      if (!to.amount) recipient++;
    }
    return { rows, transfers };
  }

  const sum = items => items.length ? items.reduce((total, item) => total + item.amount, 0) : null;
  globalThis.TravelModel = {
    collections, tripStatus, bookingStatus, taskStatus, documentStatus, documentTypes, categories, criteria, defaultWeights,
    maxAmount, field, defaultValue, safeURL, validate, score, order, travelDate, matches, split, sum
  };
})();

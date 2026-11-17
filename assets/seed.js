"use strict";

globalThis.TravelSeed = {
  schemaVersion: 1,
  weights: { budget: 30, dates: 25, family: 30, travel: 15 },
  trips: [
    { id: "hokkaido", country: "日本", destination: "北海道", name: "北海道自由行", artwork: "hokkaido", activities: ["自然景觀", "美食"] },
    { id: "seoul", country: "韓國", destination: "首爾", name: "首爾城市小旅行", artwork: "seoul", activities: ["城市散步", "美食"] },
    { id: "germany", country: "歐洲", destination: "德國", name: "德國古城旅行", artwork: "germany", activities: ["文化古蹟", "自然景觀"] },
    { id: "italy", country: "歐洲", destination: "義大利", name: "義大利文化之旅", artwork: "italy", activities: ["文化古蹟", "美食"] },
    { id: "tokyo", country: "日本", destination: "東京", name: "東京旅行", status: "completed", confirmed: true },
    { id: "osaka", country: "日本", destination: "大阪", name: "大阪旅行", status: "completed", confirmed: true }
  ],
  members: [
    { id: "member-me", name: "我" }, { id: "member-partner", name: "另一半" },
    { id: "member-one", name: "家人 1" }, { id: "member-two", name: "家人 2" }
  ],
  itinerary: [
    { id: "hokkaido-1", tripId: "hokkaido", day: 1, title: "抵達後前往住宿", activity: "交通" },
    { id: "hokkaido-2", tripId: "hokkaido", day: 2, title: "安排郊外景觀半日遊", activity: "自然景觀" },
    { id: "seoul-1", tripId: "seoul", day: 1, title: "抵達後在住宿附近用餐", activity: "美食" },
    { id: "seoul-2", tripId: "seoul", day: 2, title: "規劃宮殿與街區散步路線", activity: "城市散步" },
    { id: "germany-1", tripId: "germany", day: 1, title: "抵達後確認城際交通安排", activity: "交通" },
    { id: "germany-2", tripId: "germany", day: 2, title: "挑選一座古城安排半日散步", activity: "文化古蹟" },
    { id: "italy-1", tripId: "italy", day: 1, title: "抵達後寄放行李，在住宿附近用餐", activity: "美食" },
    { id: "italy-2", tripId: "italy", day: 2, title: "安排古蹟參觀與步行路線", activity: "文化古蹟" }
  ],
  flights: [], stays: [], budgetItems: [], expenses: [],
  tasks: [
    { id: "task-dates", title: "確認全家人可以請假的日期" },
    { id: "task-budget", title: "討論全家旅費上限" },
    { id: "task-passports", title: "檢查家人的護照有效期限" },
    { id: "task-shortlist", title: "比較目的地後挑出優先方案" }
  ],
  documents: [
    { id: "doc-passports", type: "passport", title: "家人護照檢查" },
    { id: "doc-insurance", type: "insurance", title: "旅遊保險資料" }
  ]
};

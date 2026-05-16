// 座席定義
const counterSeats = Array.from({ length: 9 }, (_, i) => `C${i + 1}`);
const tableSeats = Array.from({ length: 19 }, (_, i) => `T${i + 1}`);

const STORAGE_KEY = "izakaya_reservations";

// フォーム要素取得
const reserveForm = document.getElementById("reserve-form");
const reserveDate = document.getElementById("reserve-date");
const reserveTime = document.getElementById("reserve-time");
const reserveName = document.getElementById("reserve-name");
const reservePhone = document.getElementById("reserve-phone");
const reservePeople = document.getElementById("reserve-people");
const reserveCourse = document.getElementById("reserve-course");
const reserveNote = document.getElementById("reserve-note");

const completeModal = document.getElementById("complete-modal");
const completeMessage = document.getElementById("complete-message");

// 画面切り替え
const sections = document.querySelectorAll("main section");
const menuButtons = document.querySelectorAll(".menu-btn");
const backButtons = document.querySelectorAll(".back-btn");

function showSection(id) {
  sections.forEach((sec) => sec.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showSection(btn.dataset.target);
    if (btn.dataset.target === "today") refreshTodayList();
    if (btn.dataset.target === "list") refreshReservationList();
  });
});

backButtons.forEach((btn) => {
  btn.addEventListener("click", () => showSection("main-menu"));
});

// 時間プルダウン生成（17:00〜24:00 15分刻み）
function generateTimeOptions() {
  for (let h = 17; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const opt = document.createElement("option");
      opt.value = `${hh}:${mm}`;
      opt.textContent = `${hh}:${mm}`;
      reserveTime.appendChild(opt);
    }
  }
}
generateTimeOptions();


// 座席生成
function createSeatButtons(seats, containerId) {
  const container = document.getElementById(containerId);
  seats.forEach((seat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = seat;
    btn.className = "seat";
    btn.dataset.seatId = seat;
    btn.addEventListener("click", () => {
      if (!btn.classList.contains("reserved")) {
        btn.classList.toggle("selected");
      }
    });
    container.appendChild(btn);
  });
}

createSeatButtons(counterSeats, "counter-seats");
createSeatButtons(tableSeats, "table-seats");

// データ保存
function loadReservations() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveReservations(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// 席の空き状況反映
function updateSeatAvailability(date, time) {
  const reservations = loadReservations();
  const reservedSeats = reservations
    .filter((r) => r.date === date && r.time === time)
    .flatMap((r) => r.seats);

  document.querySelectorAll(".seat").forEach((seat) => {
    seat.classList.remove("reserved", "selected");
    if (reservedSeats.includes(seat.dataset.seatId)) {
      seat.classList.add("reserved");
    }
  });
}

reserveDate.addEventListener("change", () => {
  if (reserveDate.value && reserveTime.value)
    updateSeatAvailability(reserveDate.value, reserveTime.value);
});

reserveTime.addEventListener("change", () => {
  if (reserveDate.value && reserveTime.value)
    updateSeatAvailability(reserveDate.value, reserveTime.value);
});

// 予約登録・編集
reserveForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = reserveForm.dataset.editId
    ? Number(reserveForm.dataset.editId)
    : Date.now();

  const seats = Array.from(
    document.querySelectorAll(".seat.selected")
  ).map((s) => s.dataset.seatId);

  if (seats.length === 0) {
    alert("座席を選択してください");
    return;
  }

  const reservation = {
    id,
    date: reserveDate.value,
    time: reserveTime.value,
    name: reserveName.value,
    phone: reservePhone.value,
    people: Number(reservePeople.value),
    course: reserveCourse.value,
    seats,
    note: reserveNote.value,
  };

  let list = loadReservations();
  list = list.filter((r) => r.id !== id);
  list.push(reservation);
  saveReservations(list);

  reserveForm.reset();
  reserveForm.dataset.editId = "";
  document.querySelectorAll(".seat.selected").forEach((s) => s.classList.remove("selected"));

  completeMessage.textContent = "予約を保存しました";
  completeModal.classList.remove("hidden");

  refreshReservationList();
  refreshTodayList();
});

// モーダル閉じる
document.getElementById("close-complete").addEventListener("click", () => {
  completeModal.classList.add("hidden");
  showSection("main-menu");
});

// 自動席割り当て
document.getElementById("auto-assign").addEventListener("click", () => {
  const people = Number(reservePeople.value);
  if (!people) return alert("人数を入力してください");

  document.querySelectorAll(".seat.selected").forEach((s) => s.classList.remove("selected"));

  let remaining = people;

  const counters = document.querySelectorAll("#counter-seats .seat:not(.reserved)");
  const tables = document.querySelectorAll("#table-seats .seat:not(.reserved)");

  if (remaining <= 2) {
    for (const c of counters) {
      c.classList.add("selected");
      remaining -= 1;
      if (remaining <= 0) break;
    }
  }

  for (const t of tables) {
    if (remaining <= 0) break;
    t.classList.add("selected");
    remaining -= 4;
  }
});

// 予約一覧
const listDate = document.getElementById("list-date");
const searchName = document.getElementById("search-name");
const listEl = document.getElementById("reservation-list");

function refreshReservationList() {
  const list = loadReservations();
  const date = listDate.value;
  const name = searchName.value;

  let filtered = list;
  if (date) filtered = filtered.filter((r) => r.date === date);
  if (name) filtered = filtered.filter((r) => r.name.includes(name));

  listEl.innerHTML = "";

  if (filtered.length === 0) {
    listEl.textContent = "予約なし";
    return;
  }

  filtered
    .sort((a, b) => (a.time > b.time ? 1 : -1))
    .forEach((r) => {
      const div = document.createElement("div");
      div.className = "reservation-item";
      div.innerHTML = `
        <strong>${r.time} / ${r.name} 様 (${r.people}名)</strong><br>
        コース: ${r.course}<br>
        座席: ${r.seats.join(", ")}<br>
        メモ: ${r.note || "なし"}<br>
        <button class="edit-btn" data-id="${r.id}">編集</button>
        <button class="delete-btn" data-id="${r.id}">削除</button>
      `;
      listEl.appendChild(div);
    });
}

listDate.addEventListener("change", refreshReservationList);
searchName.addEventListener("input", refreshReservationList);

// 編集
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-btn")) {
    const id = Number(e.target.dataset.id);
    const r = loadReservations().find((r) => r.id === id);
    if (!r) return;

    reserveDate.value = r.date;
    reserveTime.value = r.time;
    reserveName.value = r.name;
    reservePhone.value = r.phone;
    reservePeople.value = r.people;
    reserveCourse.value = r.course;
    reserveNote.value = r.note;

    updateSeatAvailability(r.date, r.time);

    document.querySelectorAll(".seat").forEach((seat) => {
      if (r.seats.includes(seat.dataset.seatId)) {
        seat.classList.add("selected");
      }
    });

    reserveForm.dataset.editId = id;

    showSection("reserve");
  }
});

// 削除
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = Number(e.target.dataset.id);
    if (confirm("本当に削除しますか？")) {
      const list = loadReservations().filter((r) => r.id !== id);
      saveReservations(list);
      refreshReservationList();
      refreshTodayList();
    }
  }
});

// 今日の予約
const todayListEl = document.getElementById("today-list");

function refreshTodayList() {
  const list = loadReservations();
  const today = new Date().toISOString().split("T")[0];

  const filtered = list.filter((r) => r.date === today);

  todayListEl.innerHTML = "";

  if (filtered.length === 0) {
    todayListEl.textContent = "本日の予約はありません";
    return;
  }

  filtered
    .sort((a, b) => (a.time > b.time ? 1 : -1))
    .forEach((r) => {
      const div = document.createElement("div");
      div.className = "reservation-item";
      div.innerHTML = `
        <strong>${r.time} / ${r.name} 様 (${r.people}名)</strong><br>
        コース: ${r.course}<br>
        座席: ${r.seats.join(", ")}
      `;
      todayListEl.appendChild(div);
    });
}

// 初期化
(function init() {
  const today = new Date().toISOString().split("T")[0];
  reserveDate.value = today;
  listDate.value = today;
  refreshReservationList();
  refreshTodayList();
})();

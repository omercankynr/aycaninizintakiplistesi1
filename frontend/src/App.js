import React, { useEffect, useState, useCallback, useMemo } from "react";
import "@/App.css";
import axios from "axios";

/**
 * EN STABİL API AYARI
 * - Render'da frontend ve backend çoğu zaman farklı subdomain olur.
 * - Bu yüzden default olarak backend URL'sine gider.
 * - İstersen Render Frontend env'e VITE_API_BASE koyup yönetebilirsin.
 *
 * Render Frontend ENV (opsiyonel):
 *   VITE_API_BASE = https://aycaninizintakiplistesi1.onrender.com
 */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? ""
    : "https://aycaninizintakiplistesi1.onrender.com");

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

// -------------------- Helpers --------------------
const ensureArray = (v) => (Array.isArray(v) ? v : []);

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const DEFAULT_COLORS = [
  "#E91E63", "#2196F3", "#FF5722", "#9C27B0", "#00BCD4", "#4CAF50",
  "#CDDC39", "#FF9800", "#795548", "#607D8B", "#F44336", "#673AB7",
  "#3F51B5", "#009688", "#8BC34A", "#FFC107", "#FF5252", "#7C4DFF",
];

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  return `${day} ${months[date.getMonth()]}`;
};

const getWeeksOfYear2026 = () => {
  const weeks = [];
  let currentDate = new Date(Date.UTC(2025, 11, 29)); // 29 Aralık 2025 Pazartesi

  const formatDateLabel = (date) => {
    const day = date.getUTCDate();
    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
    ];
    return `${day} ${months[date.getUTCMonth()]}`;
  };

  while (currentDate.getUTCFullYear() <= 2026) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    if (weekStart.getUTCFullYear() > 2026 && weekStart.getUTCMonth() > 0) break;

    const startStr = `${weekStart.getUTCFullYear()}-${String(
      weekStart.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(weekStart.getUTCDate()).padStart(2, "0")}`;

    const endStr = `${weekEnd.getUTCFullYear()}-${String(
      weekEnd.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(weekEnd.getUTCDate()).padStart(2, "0")}`;

    weeks.push({
      start: startStr,
      end: endStr,
      label: `${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)}`,
      month: weekEnd.getUTCMonth(),
    });

    currentDate.setUTCDate(currentDate.getUTCDate() + 7);
  }

  return weeks;
};

const getDaysOfWeek = (weekStart) => {
  const days = [];
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);

    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getUTCDate()).padStart(2, "0")}`;

    days.push({
      name: dayNames[i],
      date: dateStr,
      dayOfMonth: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
    });
  }
  return days;
};

// -------------------- Components --------------------
const EmployeeSelect = ({ employees, value, onChange, placeholder = "Temsilci Seçin" }) => {
  const safeEmployees = ensureArray(employees);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded-lg text-sm bg-white"
    >
      <option value="">{placeholder}</option>
      {safeEmployees.map((emp) => (
        <option key={emp.id} value={String(emp.id)}>
          {emp.name} {emp.position === "TL" ? "(TL)" : ""}
        </option>
      ))}
    </select>
  );
};

const LeaveSlot = ({ employee, onRemove }) => {
  if (!employee) {
    return <div className="h-8 border border-dashed border-gray-300 rounded"></div>;
  }

  return (
    <div
      className="h-8 rounded flex items-center justify-between px-2 text-white text-xs font-medium cursor-pointer hover:opacity-80"
      style={{ backgroundColor: employee.color }}
      onClick={onRemove}
      title="Silmek için tıkla"
    >
      <span className="truncate">{employee.short_name}</span>
      <span className="text-white/70 ml-1">×</span>
    </div>
  );
};

const DayColumn = ({ day, leaves, employees, onAddLeave, onRemoveLeave, isToday }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const safeLeaves = ensureArray(leaves);
  const safeEmployees = ensureArray(employees);

  const dayLeaves = safeLeaves.filter((l) => l?.date === day.date);

  const availableEmployees = safeEmployees.filter(
    (emp) => !dayLeaves.some((l) => String(l.employee_id) === String(emp.id))
  );

  const getEmployeeById = (id) =>
    safeEmployees.find((e) => String(e.id) === String(id)) || null;

  const needsApproval = ["Pazartesi", "Cuma", "Cumartesi", "Pazar"].includes(day.name);
  const isFlexDay = ["Salı", "Çarşamba", "Perşembe"].includes(day.name);

  return (
    <div className={`min-w-[100px] flex-1 ${isToday ? "bg-red-50" : ""}`}>
      <div
        className={`text-center py-2 font-medium text-xs border-b ${
          needsApproval ? "bg-yellow-100" : isFlexDay ? "bg-green-100" : "bg-gray-100"
        }`}
      >
        <div>{day.name}</div>
        <div className="text-xs text-gray-500">
          {day.dayOfMonth}/{day.month}
        </div>
      </div>

      <div className="p-1 space-y-1">
        {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
          const leave = dayLeaves.find((l) => l?.slot === slot) || null;
          return (
            <LeaveSlot
              key={slot}
              employee={leave ? getEmployeeById(leave.employee_id) : null}
              onRemove={() => leave && onRemoveLeave(leave)}
            />
          );
        })}
      </div>

      {!isToday && (
        <div className="p-1">
          {showDropdown ? (
            <div className="relative">
              <select
                className="w-full p-1 text-xs border rounded bg-white"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    const nextSlot = Math.min(dayLeaves.length, 6);
                    onAddLeave(day.date, v, nextSlot);
                    setShowDropdown(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                autoFocus
              >
                <option value="">Seçin...</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.short_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={() => setShowDropdown(true)}
              className="w-full p-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={dayLeaves.length >= 7}
            >
              + Ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const WeeklySchedule = ({ week, leaves, employees, onAddLeave, onRemoveLeave }) => {
  const days = getDaysOfWeek(week.start);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="bg-blue-600 text-white text-center py-2 font-bold text-sm">{week.label}</div>
      <div className="flex overflow-x-auto">
        {days.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            leaves={leaves}
            employees={employees}
            onAddLeave={onAddLeave}
            onRemoveLeave={onRemoveLeave}
            isToday={day.date === today}
          />
        ))}
      </div>
    </div>
  );
};

const RulesPanel = ({ collapsed, onToggle }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
    <button onClick={onToggle} className="w-full p-3 flex justify-between items-center text-left">
      <h3 className="font-bold text-lg text-yellow-800">KULLANIM KURALLARI</h3>
      <span className="text-yellow-600">{collapsed ? "▼" : "▲"}</span>
    </button>
    {!collapsed && (
      <div className="px-4 pb-4">
        <ul className="space-y-2 text-sm text-yellow-900">
          <li className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <span>
              Pazartesi, Cuma, Cumartesi ve Pazar günleri izin kullanmak isteyen temsilcilerimizin,
              öncelikle takım liderlerinden onay almaları gerekmektedir.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-red-600 mr-2">•</span>
            <span className="text-red-700 font-medium">
              Bu günler için izin kullanımı yasaktır. Yalnızca önemli ve zorunlu durumlarda istisna
              uygulanabilir.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">•</span>
            <span>
              Salı, Çarşamba ve Perşembe günleri izinler; 4-4-3, 3-4-4 veya 4-3-3 şeklinde
              planlanabilir.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 mr-2">•</span>
            <span>Rabia Batuk ve Ayça Demir aynı gün izinli olamaz.</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>
              Ayça Çisem Çoban'ın izinli olduğu günlerde, ek olarak iki kişi daha izin kullanabilir;
              bu günlerde toplam üç kişilik izin hakkı bulunmaktadır.
            </span>
          </li>
        </ul>
      </div>
    )}
  </div>
);

// -------------------- Employee Management --------------------
const EmployeeManagement = ({ employees, onAdd, onUpdate, onDelete, onClose }) => {
  const safeEmployees = ensureArray(employees);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    position: "Agent",
    work_type: "Office",
    color: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.short_name) return;

    if (editingId) onUpdate(editingId, formData);
    else onAdd(formData);

    setEditingId(null);
    setFormData({ name: "", short_name: "", position: "Agent", work_type: "Office", color: "" });
    setShowAddForm(false);
  };

  const startEdit = (emp) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      short_name: emp.short_name,
      position: emp.position || "Agent",
      work_type: emp.work_type || "Office",
      color: emp.color,
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", short_name: "", position: "Agent", work_type: "Office", color: "" });
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Temsilci Yönetimi</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-bold mb-3">{editingId ? "Temsilci Düzenle" : "Yeni Temsilci Ekle"}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Ad Soyad (örn: AHMET YILMAZ)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  className="p-2 border rounded-lg text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Kısa Ad (örn: AHMET Y.)"
                  value={formData.short_name}
                  onChange={(e) =>
                    setFormData({ ...formData, short_name: e.target.value.toUpperCase() })
                  }
                  className="p-2 border rounded-lg text-sm"
                  required
                />
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="p-2 border rounded-lg text-sm bg-white"
                >
                  <option value="TL">Takım Lideri</option>
                  <option value="Agent">Temsilci</option>
                </select>
                <select
                  value={formData.work_type}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  className="p-2 border rounded-lg text-sm bg-white"
                >
                  <option value="Office">Şirket Çalışanı</option>
                  <option value="HomeOffice">Home Office</option>
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      formData.color ||
                      DEFAULT_COLORS[safeEmployees.length % DEFAULT_COLORS.length]
                    }
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Renk Seçin</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-medium"
                >
                  {editingId ? "Güncelle" : "Ekle"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm font-medium"
                >
                  İptal
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 font-medium mb-4"
            >
              + Yeni Temsilci Ekle
            </button>
          )}

          <div className="space-y-2">
            {safeEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: emp.color }}
                  >
                    {String(emp.short_name || "").substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-sm text-gray-500">
                      {emp.position === "TL" ? "Takım Lideri" : "Temsilci"} •{" "}
                      {emp.work_type === "HomeOffice" ? "Home Office" : "Şirket"} • {emp.short_name}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(emp)}
                    className="text-blue-500 hover:text-blue-700 px-2 py-1 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`${emp.name} silinsin mi?`)) onDelete(emp.id);
                    }}
                    className="text-red-500 hover:text-red-700 px-2 py-1 text-sm"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------- Overtime --------------------
const OvertimeForm = ({ employees, onSubmit }) => {
  const safeEmployees = ensureArray(employees);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (employeeId && date && hours) {
      onSubmit({ employee_id: employeeId, date, hours: parseFloat(hours) });
      setEmployeeId("");
      setDate("");
      setHours("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-bold text-lg mb-3 text-gray-800">Fazla Çalışma Ekle</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <EmployeeSelect employees={safeEmployees} value={employeeId} onChange={setEmployeeId} />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 border rounded-lg text-sm"
        />
        <input
          type="number"
          step="0.5"
          min="0.5"
          max="12"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="Saat"
          className="p-2 border rounded-lg text-sm"
        />
        <button
          type="submit"
          className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 text-sm font-medium"
        >
          Ekle
        </button>
      </div>
    </form>
  );
};

const OvertimeTable = ({ overtime, employees, onDelete }) => {
  const safeEmployees = ensureArray(employees);
  const safeOvertime = ensureArray(overtime);

  const getEmployeeById = (id) => safeEmployees.find((e) => String(e.id) === String(id)) || null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="bg-green-600 text-white text-center py-3 font-bold">Fazla Çalışmalar</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Temsilci</th>
              <th className="p-2 text-left">Tarih</th>
              <th className="p-2 text-left">Saat</th>
              <th className="p-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {safeOvertime.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Henüz fazla çalışma kaydı yok
                </td>
              </tr>
            ) : (
              safeOvertime.map((item) => {
                const emp = getEmployeeById(item.employee_id);
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <span
                        className="px-2 py-1 rounded text-white text-xs"
                        style={{ backgroundColor: emp?.color || "#666" }}
                      >
                        {emp?.short_name || item.employee_id}
                      </span>
                    </td>
                    <td className="p-2">{formatDate(item.date)}</td>
                    <td className="p-2 font-medium">{item.hours} saat</td>
                    <td className="p-2">
                      {onDelete ? (
                        <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700">
                          Sil
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// -------------------- Leave Types --------------------
const LeaveTypeForm = ({ employees, onSubmit }) => {
  const safeEmployees = ensureArray(employees);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [hours, setHours] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (employeeId && date && leaveType) {
      const data = { employee_id: employeeId, date, leave_type: leaveType };
      if (leaveType === "compensatory" && hours) data.hours = parseFloat(hours);
      onSubmit(data);
      setEmployeeId("");
      setDate("");
      setLeaveType("");
      setHours("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-bold text-lg mb-3 text-gray-800">İzin Türü Ekle</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <EmployeeSelect employees={safeEmployees} value={employeeId} onChange={setEmployeeId} />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 border rounded-lg text-sm"
        />
        <select
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          className="p-2 border rounded-lg text-sm bg-white"
        >
          <option value="">İzin Türü Seçin</option>
          <option value="unpaid">Ücretsiz İzin</option>
          <option value="annual">Yıllık İzin</option>
          <option value="compensatory">Telafi İzni</option>
        </select>
        {leaveType === "compensatory" && (
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="8"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Saat"
            className="p-2 border rounded-lg text-sm"
          />
        )}
        <button
          type="submit"
          className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 text-sm font-medium"
        >
          Ekle
        </button>
      </div>
    </form>
  );
};

const LeaveTypeTable = ({ leaveTypes, employees, onDelete }) => {
  const safeEmployees = ensureArray(employees);
  const safeLeaveTypes = ensureArray(leaveTypes);

  const getEmployeeById = (id) => safeEmployees.find((e) => String(e.id) === String(id)) || null;

  const getLeaveTypeName = (type) => {
    switch (type) {
      case "unpaid":
        return "Ücretsiz İzin";
      case "annual":
        return "Yıllık İzin";
      case "compensatory":
        return "Telafi İzni";
      default:
        return type;
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case "unpaid":
        return "bg-red-100 text-red-800";
      case "annual":
        return "bg-blue-100 text-blue-800";
      case "compensatory":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="bg-purple-600 text-white text-center py-3 font-bold">İzin Türleri</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Temsilci</th>
              <th className="p-2 text-left">Tarih</th>
              <th className="p-2 text-left">Tür</th>
              <th className="p-2 text-left">Saat</th>
              <th className="p-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {safeLeaveTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Henüz izin türü kaydı yok
                </td>
              </tr>
            ) : (
              safeLeaveTypes.map((item) => {
                const emp = getEmployeeById(item.employee_id);
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <span
                        className="px-2 py-1 rounded text-white text-xs"
                        style={{ backgroundColor: emp?.color || "#666" }}
                      >
                        {emp?.short_name || item.employee_id}
                      </span>
                    </td>
                    <td className="p-2">{formatDate(item.date)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${getLeaveTypeColor(item.leave_type)}`}>
                        {getLeaveTypeName(item.leave_type)}
                      </span>
                    </td>
                    <td className="p-2">
                      {item.leave_type === "compensatory" && item.hours ? `${item.hours} saat` : "-"}
                    </td>
                    <td className="p-2">
                      {onDelete ? (
                        <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700">
                          Sil
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// -------------------- Meal List --------------------
const MealList = ({ week, leaves, employees }) => {
  const days = getDaysOfWeek(week.start);

  const safeLeaves = ensureArray(leaves);
  const safeEmployees = ensureArray(employees);

  const officeEmployees = safeEmployees.filter((emp) => !emp.work_type || emp.work_type === "Office");
  const homeOfficeEmployees = safeEmployees.filter((emp) => emp.work_type === "HomeOffice");
  const totalOfficeEmployees = officeEmployees.length;

  const getDayData = (day) => {
    const dayLeaves = safeLeaves.filter((l) => l?.date === day.date);
    const onLeaveIds = dayLeaves.map((l) => String(l.employee_id));
    const workingEmployees = officeEmployees.filter((emp) => !onLeaveIds.includes(String(emp.id)));
    const onLeaveEmployees = officeEmployees.filter((emp) => onLeaveIds.includes(String(emp.id)));
    return { working: workingEmployees, onLeave: onLeaveEmployees, count: workingEmployees.length };
  };

  const weeklyTotal = days.reduce((total, day) => total + getDayData(day).count, 0);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="bg-orange-500 text-white text-center py-2 font-bold text-sm">
        {week.label} - Yemek Listesi
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left border-r">Gün</th>
              <th className="p-2 text-left border-r">Tarih</th>
              <th className="p-2 text-center border-r">Yemek Adedi</th>
              <th className="p-2 text-left border-r">Çalışan Personel</th>
              <th className="p-2 text-left">İzinli Personel</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const dayData = getDayData(day);
              return (
                <tr key={day.date} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium border-r">{day.name}</td>
                  <td className="p-2 border-r">
                    {day.dayOfMonth}/{day.month}
                  </td>
                  <td className="p-2 text-center border-r">
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full font-bold">
                      {dayData.count}
                    </span>
                  </td>
                  <td className="p-2 border-r">
                    <div className="flex flex-wrap gap-1">
                      {dayData.working.length > 0 ? (
                        dayData.working.map((emp) => (
                          <span
                            key={emp.id}
                            className="px-2 py-1 rounded text-white text-xs"
                            style={{ backgroundColor: emp.color }}
                          >
                            {emp.short_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {dayData.onLeave.length > 0 ? (
                        dayData.onLeave.map((emp) => (
                          <span
                            key={emp.id}
                            className="px-2 py-1 rounded text-white text-xs opacity-60"
                            style={{ backgroundColor: emp.color }}
                          >
                            {emp.short_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-orange-50 p-3 border-t">
        <div className="flex flex-wrap justify-between items-center text-sm gap-2">
          <div>
            <span className="font-medium">Şirket Çalışanı:</span> {totalOfficeEmployees} kişi
            {homeOfficeEmployees.length > 0 && (
              <span className="ml-2 text-blue-600">(Home Office: {homeOfficeEmployees.length} kişi)</span>
            )}
          </div>
          <div>
            <span className="font-medium">Haftalık Toplam Yemek:</span>{" "}
            <span className="bg-orange-500 text-white px-3 py-1 rounded-full font-bold">
              {weeklyTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children, color }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
      active ? `${color} text-white` : "bg-gray-200 text-gray-600 hover:bg-gray-300"
    }`}
  >
    {children}
  </button>
);

// -------------------- App --------------------
export default function App() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(0);
  const [activeTab, setActiveTab] = useState("schedule");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rulesCollapsed, setRulesCollapsed] = useState(true);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);

  const [currentUserId, setCurrentUserId] = useState(localStorage.getItem("currentUserId") || "");

  const allWeeks = useMemo(() => getWeeksOfYear2026(), []);
  const safeEmployees = ensureArray(employees);
  const safeLeaves = ensureArray(leaves);

  const weeksOfMonth = useMemo(() => {
    return allWeeks.filter((week) => {
      const weekStart = new Date(week.start);
      const weekEnd = new Date(week.end);
      return weekStart.getMonth() === selectedMonth || weekEnd.getMonth() === selectedMonth;
    });
  }, [allWeeks, selectedMonth]);

  const currentUser =
    safeEmployees.find((e) => String(e.id) === String(currentUserId)) || null;

  const isTeamLeader = currentUser?.position === "TL";

  const handleUserChange = (userId) => {
    setCurrentUserId(userId);
    localStorage.setItem("currentUserId", userId);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [empRes, leavesRes, overtimeRes, leaveTypesRes] = await Promise.all([
        api.get("/employees"),
        api.get("/leaves"),
        api.get("/overtime"),
        api.get("/leave-types"),
      ]);

      setEmployees(ensureArray(empRes.data));
      setLeaves(ensureArray(leavesRes.data));
      setOvertime(ensureArray(overtimeRes.data));
      setLeaveTypes(ensureArray(leaveTypesRes.data));

      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------- CRUD --------------------
  const handleAddEmployee = async (data) => {
    try {
      await api.post("/employees", data);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Temsilci eklenirken hata oluştu");
    }
  };

  const handleUpdateEmployee = async (id, data) => {
    try {
      await api.put(`/employees/${id}`, data);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Temsilci güncellenirken hata oluştu");
    }
  };

  const handleDeleteEmployee = async (id) => {
    try {
      await api.delete(`/employees/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Temsilci silinirken hata oluştu");
    }
  };

  const handleAddLeave = async (date, employeeId, slot) => {
    try {
      const week = allWeeks.find((w) => {
        const start = new Date(w.start);
        const end = new Date(w.end);
        const d = new Date(date);
        return d >= start && d <= end;
      });

      await api.post("/leaves", {
        employee_id: employeeId,
        date,
        week_start: week?.start || date,
        slot,
      });

      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin eklenirken hata oluştu");
    }
  };

  const handleRemoveLeave = async (leave) => {
    try {
      await api.delete(`/leaves/${leave.id}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin silinirken hata oluştu");
    }
  };

  const handleAddOvertime = async (data) => {
    try {
      await api.post("/overtime", data);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Fazla çalışma eklenirken hata oluştu");
    }
  };

  const handleDeleteOvertime = async (id) => {
    try {
      await api.delete(`/overtime/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Fazla çalışma silinirken hata oluştu");
    }
  };

  const handleAddLeaveType = async (data) => {
    try {
      await api.post("/leave-types", data);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin türü eklenirken hata oluştu");
    }
  };

  const handleDeleteLeaveType = async (id) => {
    try {
      await api.delete(`/leave-types/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin türü silinirken hata oluştu");
    }
  };

  // -------------------- UI states --------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-700 text-white py-3 shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h1 className="text-xl font-bold">İzin Yönetim Sistemi - 2026</h1>

            <div className="flex items-center gap-2">
              <select
                value={currentUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                className="bg-blue-600 text-white border border-blue-500 rounded px-2 py-1 text-sm"
              >
                <option value="">Kullanıcı Seçin</option>
                {safeEmployees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.short_name} {emp.position === "TL" ? "(TL)" : ""}
                  </option>
                ))}
              </select>

              {isTeamLeader && (
                <button
                  onClick={() => setShowEmployeeManagement(true)}
                  className="bg-blue-600 hover:bg-blue-800 px-3 py-1 rounded text-sm font-medium"
                >
                  Temsilci Yönetimi
                </button>
              )}
            </div>
          </div>

          {currentUser && (
            <div className="text-center text-blue-200 text-sm mt-1">
              Hoşgeldin, {currentUser.name} {isTeamLeader && "(Takım Lideri)"}
            </div>
          )}
        </div>
      </header>

      {showEmployeeManagement && (
        <EmployeeManagement
          employees={safeEmployees}
          onAdd={handleAddEmployee}
          onUpdate={handleUpdateEmployee}
          onDelete={handleDeleteEmployee}
          onClose={() => setShowEmployeeManagement(false)}
        />
      )}

      <main className="container mx-auto px-2 py-4">
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          <TabButton active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} color="bg-blue-600">
            İzin Takvimi
          </TabButton>
          <TabButton active={activeTab === "overtime"} onClick={() => setActiveTab("overtime")} color="bg-green-600">
            Fazla Çalışma
          </TabButton>
          <TabButton active={activeTab === "leaveTypes"} onClick={() => setActiveTab("leaveTypes")} color="bg-purple-600">
            İzin Türleri
          </TabButton>
          <TabButton active={activeTab === "mealList"} onClick={() => setActiveTab("mealList")} color="bg-orange-500">
            Yemek Listesi
          </TabButton>
        </div>

        {activeTab === "schedule" && (
          <>
            <RulesPanel collapsed={rulesCollapsed} onToggle={() => setRulesCollapsed(!rulesCollapsed)} />

            <div className="bg-white rounded-lg shadow-md p-3 mb-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {MONTHS.map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === index ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>

            {weeksOfMonth.map((week) => (
              <WeeklySchedule
                key={week.start}
                week={week}
                leaves={safeLeaves}
                employees={safeEmployees}
                onAddLeave={handleAddLeave}
                onRemoveLeave={handleRemoveLeave}
              />
            ))}

            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Temsilciler ({safeEmployees.length})</h3>
              <div className="flex flex-wrap gap-2">
                {safeEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="px-3 py-1 rounded text-white text-xs"
                    style={{ backgroundColor: emp.color }}
                  >
                    {emp.short_name} {emp.position === "TL" ? "(TL)" : ""}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "overtime" && (
          <>
            <OvertimeForm employees={safeEmployees} onSubmit={handleAddOvertime} />
            <OvertimeTable overtime={overtime} employees={safeEmployees} onDelete={isTeamLeader ? handleDeleteOvertime : null} />
          </>
        )}

        {activeTab === "leaveTypes" && (
          <>
            <LeaveTypeForm employees={safeEmployees} onSubmit={handleAddLeaveType} />
            <LeaveTypeTable leaveTypes={leaveTypes} employees={safeEmployees} onDelete={isTeamLeader ? handleDeleteLeaveType : null} />
          </>
        )}

        {activeTab === "mealList" && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-lg text-orange-800 mb-2">Yemek Listesi</h3>
              <p className="text-sm text-orange-700">
                Şirket çalışanları için yemek listesi. Home Office çalışanlar dahil edilmez.
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <p className="text-orange-600">
                  <strong>Şirket Çalışanı:</strong>{" "}
                  {safeEmployees.filter((e) => !e.work_type || e.work_type === "Office").length} kişi
                </p>
                <p className="text-blue-600">
                  <strong>Home Office:</strong> {safeEmployees.filter((e) => e.work_type === "HomeOffice").length} kişi
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-3 mb-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {MONTHS.map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === index ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>

            {weeksOfMonth.map((week) => (
              <MealList key={week.start} week={week} leaves={safeLeaves} employees={safeEmployees} />
            ))}
          </>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm">© 2026 İzin Yönetim Sistemi</div>
      </footer>
    </div>
  );
}

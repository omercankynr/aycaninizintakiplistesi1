import React, { useEffect, useState, useCallback } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper functions
const getWeeksOfYear2026 = () => {
  const weeks = [];
  // 2026 yılı için haftalar - Pazartesi'den Pazar'a
  // İlk hafta: 29 Aralık 2025 (Pazartesi) - 4 Ocak 2026 (Pazar)
  let currentDate = new Date(Date.UTC(2025, 11, 29)); // 29 Aralık 2025 Pazartesi
  
  const formatDateLabel = (date) => {
    const day = date.getUTCDate();
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
                    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    return `${day} ${months[date.getUTCMonth()]}`;
  };
  
  // 2026 yılı sonuna kadar
  while (currentDate.getUTCFullYear() <= 2026) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    
    // 2027'ye geçtiyse dur
    if (weekStart.getUTCFullYear() > 2026 && weekStart.getUTCMonth() > 0) break;
    
    const startStr = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStart.getUTCDate()).padStart(2, '0')}`;
    const endStr = `${weekEnd.getUTCFullYear()}-${String(weekEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(weekEnd.getUTCDate()).padStart(2, '0')}`;
    
    weeks.push({
      start: startStr,
      end: endStr,
      label: `${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)}`,
      month: weekEnd.getUTCMonth()
    });
    
    currentDate.setUTCDate(currentDate.getUTCDate() + 7);
  }
  
  return weeks;
};

const getDaysOfWeek = (weekStart) => {
  const days = [];
  const [year, month, day] = weekStart.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    days.push({
      name: dayNames[i],
      date: dateStr,
      dayOfMonth: date.getUTCDate(),
      month: date.getUTCMonth() + 1
    });
  }
  return days;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
                  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  return `${day} ${months[date.getMonth()]}`;
};

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const DEFAULT_COLORS = [
  "#E91E63", "#2196F3", "#FF5722", "#9C27B0", "#00BCD4", "#4CAF50",
  "#CDDC39", "#FF9800", "#795548", "#607D8B", "#F44336", "#673AB7",
  "#3F51B5", "#009688", "#8BC34A", "#FFC107", "#FF5252", "#7C4DFF"
];

// Components
const EmployeeSelect = ({ employees, value, onChange, placeholder = "Temsilci Seçin" }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded-lg text-sm bg-white"
    >
      <option value="">{placeholder}</option>
      {employees.map((emp) => (
        <option key={emp.id} value={emp.id}>
          {emp.name} {emp.role === "TL" ? "(TL)" : emp.role === "Company" ? "(Şirket)" : ""}
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
    >
      <span className="truncate">{employee.short_name}</span>
      <span className="text-white/70 ml-1">×</span>
    </div>
  );
};

const DayColumn = ({ day, leaves, employees, onAddLeave, onRemoveLeave, isToday }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dayLeaves = leaves.filter(l => l.date === day.date);
  const availableEmployees = employees.filter(
    emp => !dayLeaves.some(l => l.employee_id === emp.id)
  );

  const getEmployeeById = (id) => employees.find(e => e.id === id);
  
  const needsApproval = ["Pazartesi", "Cuma", "Cumartesi", "Pazar"].includes(day.name);
  const isFlexDay = ["Salı", "Çarşamba", "Perşembe"].includes(day.name);

  return (
    <div className={`min-w-[100px] flex-1 ${isToday ? 'bg-red-50' : ''}`}>
      <div className={`text-center py-2 font-medium text-xs border-b ${needsApproval ? 'bg-yellow-100' : isFlexDay ? 'bg-green-100' : 'bg-gray-100'}`}>
        <div>{day.name}</div>
        <div className="text-xs text-gray-500">{day.dayOfMonth}/{day.month}</div>
      </div>
      <div className="p-1 space-y-1">
        {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
          const leave = dayLeaves.find(l => l.slot === slot);
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
                  if (e.target.value) {
                    onAddLeave(day.date, e.target.value, dayLeaves.length);
                    setShowDropdown(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                autoFocus
              >
                <option value="">Seçin...</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
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
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="bg-blue-600 text-white text-center py-2 font-bold text-sm">
        {week.label}
      </div>
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

const RulesPanel = ({ collapsed, onToggle }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
      <button 
        onClick={onToggle}
        className="w-full p-3 flex justify-between items-center text-left"
      >
        <h3 className="font-bold text-lg text-yellow-800">KULLANIM KURALLARI</h3>
        <span className="text-yellow-600">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4">
          <ul className="space-y-2 text-sm text-yellow-900">
            <li className="flex items-start">
              <span className="text-yellow-600 mr-2">•</span>
              <span>Pazartesi, Cuma, Cumartesi ve Pazar günleri izin kullanmak isteyen temsilcilerimizin, öncelikle takım liderlerinden onay almaları gerekmektedir.</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-600 mr-2">•</span>
              <span className="text-red-700 font-medium">Bu günler için izin kullanımı yasaktır. Yalnızca önemli ve zorunlu durumlarda istisna uygulanabilir.</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">•</span>
              <span>Salı, Çarşamba ve Perşembe günleri izinler; 4-4-3, 3-4-4 veya 4-3-3 şeklinde planlanabilir.</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Rabia Batuk ve Ayça Demir aynı gün izinli olamaz.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Ayça Çisem Çoban'ın izinli olduğu günlerde, ek olarak iki kişi daha izin kullanabilir; bu günlerde toplam üç kişilik izin hakkı bulunmaktadır.</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

// Employee Management Component
const EmployeeManagement = ({ employees, onAdd, onUpdate, onDelete, onClose }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", short_name: "", role: "Agent", color: "", home_office: false });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.short_name) {
      if (editingId) {
        onUpdate(editingId, formData);
        setEditingId(null);
      } else {
        onAdd(formData);
      }
      setFormData({ name: "", short_name: "", role: "Agent", color: "", home_office: false });
      setShowAddForm(false);
    }
  };

  const startEdit = (emp) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      short_name: emp.short_name,
      role: emp.role,
      color: emp.color,
      home_office: emp.home_office || false
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", short_name: "", role: "Agent", color: "", home_office: false });
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Temsilci Yönetimi</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">&times;</button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add/Edit Form */}
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
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
                  className="p-2 border rounded-lg text-sm"
                  required
                />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="p-2 border rounded-lg text-sm bg-white"
                >
                  <option value="Agent">Temsilci</option>
                  <option value="TL">Takım Lideri (TL)</option>
                  <option value="Company">Şirket Çalışanı</option>
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color || DEFAULT_COLORS[employees.length % DEFAULT_COLORS.length]}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Renk Seçin</span>
                </div>
                {formData.role === "Company" && (
                  <div className="flex items-center gap-2 col-span-2">
                    <input
                      type="checkbox"
                      id="homeOffice"
                      checked={formData.home_office}
                      onChange={(e) => setFormData({ ...formData, home_office: e.target.checked })}
                      className="w-5 h-5 rounded cursor-pointer"
                    />
                    <label htmlFor="homeOffice" className="text-sm text-gray-700 cursor-pointer">
                      Home Office (Uzaktan Çalışma)
                    </label>
                  </div>
                )}
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

          {/* Employee List */}
          <div className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: emp.color }}
                  >
                    {emp.short_name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-sm text-gray-500">
                      {emp.role === "TL" ? "Takım Lideri" : emp.role === "Company" ? "Şirket Çalışanı" : "Temsilci"} • {emp.short_name}
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
                      if (window.confirm(`${emp.name} silinsin mi?`)) {
                        onDelete(emp.id);
                      }
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

const OvertimeForm = ({ employees, onSubmit }) => {
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
        <EmployeeSelect
          employees={employees}
          value={employeeId}
          onChange={setEmployeeId}
          placeholder="Temsilci Seçin"
        />
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
  const getEmployeeById = (id) => employees.find(e => e.id === id);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="bg-green-600 text-white text-center py-3 font-bold">
        Fazla Çalışmalar
      </div>
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
            {overtime.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Henüz fazla çalışma kaydı yok
                </td>
              </tr>
            ) : (
              overtime.map((item) => {
                const emp = getEmployeeById(item.employee_id);
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <span
                        className="px-2 py-1 rounded text-white text-xs"
                        style={{ backgroundColor: emp?.color || '#666' }}
                      >
                        {emp?.short_name || item.employee_id}
                      </span>
                    </td>
                    <td className="p-2">{formatDate(item.date)}</td>
                    <td className="p-2 font-medium">{item.hours} saat</td>
                    <td className="p-2">
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Sil
                      </button>
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

const LeaveTypeForm = ({ employees, onSubmit }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [hours, setHours] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (employeeId && date && leaveType) {
      const data = {
        employee_id: employeeId,
        date,
        leave_type: leaveType,
      };
      if (leaveType === "compensatory" && hours) {
        data.hours = parseFloat(hours);
      }
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
        <EmployeeSelect
          employees={employees}
          value={employeeId}
          onChange={setEmployeeId}
          placeholder="Temsilci Seçin"
        />
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
  const getEmployeeById = (id) => employees.find(e => e.id === id);
  const getLeaveTypeName = (type) => {
    switch (type) {
      case "unpaid": return "Ücretsiz İzin";
      case "annual": return "Yıllık İzin";
      case "compensatory": return "Telafi İzni";
      default: return type;
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case "unpaid": return "bg-red-100 text-red-800";
      case "annual": return "bg-blue-100 text-blue-800";
      case "compensatory": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="bg-purple-600 text-white text-center py-3 font-bold">
        İzin Türleri
      </div>
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
            {leaveTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Henüz izin türü kaydı yok
                </td>
              </tr>
            ) : (
              leaveTypes.map((item) => {
                const emp = getEmployeeById(item.employee_id);
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <span
                        className="px-2 py-1 rounded text-white text-xs"
                        style={{ backgroundColor: emp?.color || '#666' }}
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
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Sil
                      </button>
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

// Yemek Listesi Bileşeni
const MealList = ({ week, leaves, employees }) => {
  const days = getDaysOfWeek(week.start);
  
  // Sadece şirket çalışanlarını filtrele
  const companyEmployees = employees.filter(emp => emp.role === "Company");
  const totalCompanyEmployees = companyEmployees.length;
  
  // Her gün için çalışan (izinli olmayan) kişileri hesapla
  const getDayData = (day) => {
    const dayLeaves = leaves.filter(l => l.date === day.date);
    const onLeaveIds = dayLeaves.map(l => l.employee_id);
    const workingEmployees = companyEmployees.filter(emp => !onLeaveIds.includes(emp.id));
    const onLeaveEmployees = companyEmployees.filter(emp => onLeaveIds.includes(emp.id));
    
    return {
      working: workingEmployees,
      onLeave: onLeaveEmployees,
      count: workingEmployees.length
    };
  };

  // Haftalık toplam yemek sayısı
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
                  <td className="p-2 border-r">{day.dayOfMonth}/{day.month}</td>
                  <td className="p-2 text-center border-r">
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full font-bold">
                      {dayData.count}
                    </span>
                  </td>
                  <td className="p-2 border-r">
                    <div className="flex flex-wrap gap-1">
                      {dayData.working.length > 0 ? (
                        dayData.working.map(emp => (
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
                        dayData.onLeave.map(emp => (
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
      
      {/* Haftalık Özet */}
      <div className="bg-orange-50 p-3 border-t">
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="font-medium">Toplam Şirket Personeli:</span> {totalCompanyEmployees} kişi
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
      active
        ? `${color} text-white`
        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
    }`}
  >
    {children}
  </button>
);

function App() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(0); // Ocak ile başla
  const [activeTab, setActiveTab] = useState("schedule");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rulesCollapsed, setRulesCollapsed] = useState(true);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);

  const allWeeks = getWeeksOfYear2026();
  
  const weeksOfMonth = allWeeks.filter(week => {
    const weekStart = new Date(week.start);
    const weekEnd = new Date(week.end);
    return weekStart.getMonth() === selectedMonth || weekEnd.getMonth() === selectedMonth;
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, leavesRes, overtimeRes, leaveTypesRes] = await Promise.all([
        axios.get(`${API}/employees`),
        axios.get(`${API}/leaves`),
        axios.get(`${API}/overtime`),
        axios.get(`${API}/leave-types`),
      ]);
      setEmployees(empRes.data);
      setLeaves(leavesRes.data);
      setOvertime(overtimeRes.data);
      setLeaveTypes(leaveTypesRes.data);
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

  // Employee CRUD
  const handleAddEmployee = async (data) => {
    try {
      await axios.post(`${API}/employees`, data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Temsilci eklenirken hata oluştu");
    }
  };

  const handleUpdateEmployee = async (id, data) => {
    try {
      await axios.put(`${API}/employees/${id}`, data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Temsilci güncellenirken hata oluştu");
    }
  };

  const handleDeleteEmployee = async (id) => {
    try {
      await axios.delete(`${API}/employees/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Temsilci silinirken hata oluştu");
    }
  };

  const handleAddLeave = async (date, employeeId, slot) => {
    try {
      const week = allWeeks.find(w => {
        const start = new Date(w.start);
        const end = new Date(w.end);
        const d = new Date(date);
        return d >= start && d <= end;
      });
      
      await axios.post(`${API}/leaves`, {
        employee_id: employeeId,
        date,
        week_start: week?.start || date,
        slot,
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin eklenirken hata oluştu");
    }
  };

  const handleRemoveLeave = async (leave) => {
    try {
      await axios.delete(`${API}/leaves/${leave.id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin silinirken hata oluştu");
    }
  };

  const handleAddOvertime = async (data) => {
    try {
      await axios.post(`${API}/overtime`, data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Fazla çalışma eklenirken hata oluştu");
    }
  };

  const handleDeleteOvertime = async (id) => {
    try {
      await axios.delete(`${API}/overtime/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Fazla çalışma silinirken hata oluştu");
    }
  };

  const handleAddLeaveType = async (data) => {
    try {
      await axios.post(`${API}/leave-types`, data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin türü eklenirken hata oluştu");
    }
  };

  const handleDeleteLeaveType = async (id) => {
    try {
      await axios.delete(`${API}/leave-types/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "İzin türü silinirken hata oluştu");
    }
  };

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
      {/* Header */}
      <header className="bg-blue-700 text-white py-3 shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">İzin Yönetim Sistemi - 2026</h1>
            <button
              onClick={() => setShowEmployeeManagement(true)}
              className="bg-blue-600 hover:bg-blue-800 px-3 py-1 rounded text-sm font-medium"
            >
              Temsilci Yönetimi
            </button>
          </div>
        </div>
      </header>

      {/* Employee Management Modal */}
      {showEmployeeManagement && (
        <EmployeeManagement
          employees={employees}
          onAdd={handleAddEmployee}
          onUpdate={handleUpdateEmployee}
          onDelete={handleDeleteEmployee}
          onClose={() => setShowEmployeeManagement(false)}
        />
      )}

      {/* Main Content */}
      <main className="container mx-auto px-2 py-4">
        {/* Tabs */}
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          <TabButton
            active={activeTab === "schedule"}
            onClick={() => setActiveTab("schedule")}
            color="bg-blue-600"
          >
            İzin Takvimi
          </TabButton>
          <TabButton
            active={activeTab === "overtime"}
            onClick={() => setActiveTab("overtime")}
            color="bg-green-600"
          >
            Fazla Çalışma
          </TabButton>
          <TabButton
            active={activeTab === "leaveTypes"}
            onClick={() => setActiveTab("leaveTypes")}
            color="bg-purple-600"
          >
            İzin Türleri
          </TabButton>
          <TabButton
            active={activeTab === "mealList"}
            onClick={() => setActiveTab("mealList")}
            color="bg-orange-500"
          >
            Yemek Listesi
          </TabButton>
        </div>

        {activeTab === "schedule" && (
          <>
            <RulesPanel 
              collapsed={rulesCollapsed} 
              onToggle={() => setRulesCollapsed(!rulesCollapsed)} 
            />

            {/* Month Selector */}
            <div className="bg-white rounded-lg shadow-md p-3 mb-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {MONTHS.map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Schedules */}
            {weeksOfMonth.map((week) => (
              <WeeklySchedule
                key={week.start}
                week={week}
                leaves={leaves}
                employees={employees}
                onAddLeave={handleAddLeave}
                onRemoveLeave={handleRemoveLeave}
              />
            ))}

            {/* Employee Legend */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Temsilciler ({employees.length})</h3>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="px-3 py-1 rounded text-white text-xs"
                    style={{ backgroundColor: emp.color }}
                  >
                    {emp.short_name} {emp.role === "TL" ? "(TL)" : ""}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "overtime" && (
          <>
            <OvertimeForm employees={employees} onSubmit={handleAddOvertime} />
            <OvertimeTable
              overtime={overtime}
              employees={employees}
              onDelete={handleDeleteOvertime}
            />
          </>
        )}

        {activeTab === "leaveTypes" && (
          <>
            <LeaveTypeForm employees={employees} onSubmit={handleAddLeaveType} />
            <LeaveTypeTable
              leaveTypes={leaveTypes}
              employees={employees}
              onDelete={handleDeleteLeaveType}
            />
          </>
        )}

        {activeTab === "mealList" && (
          <>
            {/* Şirket Çalışanı Bilgisi */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-lg text-orange-800 mb-2">Şirket Çalışanları Yemek Listesi</h3>
              <p className="text-sm text-orange-700">
                Bu liste sadece "Şirket Çalışanı" rolündeki personeli gösterir. 
                İzinli olmayan personel sayısına göre günlük yemek adedi hesaplanır.
              </p>
              <p className="text-sm text-orange-600 mt-2">
                <strong>Toplam Şirket Çalışanı:</strong> {employees.filter(e => e.role === "Company").length} kişi
              </p>
            </div>

            {/* Month Selector */}
            <div className="bg-white rounded-lg shadow-md p-3 mb-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {MONTHS.map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === index
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Meal Lists */}
            {weeksOfMonth.map((week) => (
              <MealList
                key={week.start}
                week={week}
                leaves={leaves}
                employees={employees}
              />
            ))}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm">
          © 2026 İzin Yönetim Sistemi
        </div>
      </footer>
    </div>
  );
}

export default App;

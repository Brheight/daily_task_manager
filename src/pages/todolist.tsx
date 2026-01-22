import { useState, useEffect, useRef } from "react";
import { ListPlus, FileText, Trash2, Filter, Plus, X, Calendar, Tag, Clock, CheckCircle, Circle, PlayCircle, MoreVertical, Search, ChevronDown, ChevronUp, Settings, Download, ChevronRight, BarChart3 } from "lucide-react";
import axios from "axios";

interface Todo {
  id: number;
  title: string;
  notes?: string;
  status: "not started" | "pending" | "completed";
  date: string; // YYYY-MM-DD
  group?: string;
  frequency: "daily" | "weekly" | "monthly";
}

const API_URL = "https://admin.mcscglobal.org/api/todos/"; 

export default function DailyTodo() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("");
  const [groupInputType, setGroupInputType] = useState<"select" | "input">("select");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrequency, setFilterFrequency] = useState<"" | "daily" | "weekly" | "monthly">("");
  const [filterGroup, setFilterGroup] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [editedNotes, setEditedNotes] = useState<Record<number, string>>({});
  const [showStats, setShowStats] = useState(true);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];
  
useEffect(() => {
  const fetchTodos = async () => {
    try {
      const res = await axios.get(API_URL);
      setTodos(res.data);
    } catch (error) {
      console.log("Error fetching todos", error);
    }
  };
  
  fetchTodos();
}, []);
  // Get unique groups from todos
  const groups = Array.from(new Set(todos
    .map(todo => todo.group)
    .filter((group): group is string => !!group && group.trim() !== "")
  )).sort();

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await axios.post(API_URL, {
      title,
      group: group.trim() || undefined,
      frequency,
      status: "not started",
      date: today,
    });
    setTodos([res.data, ...todos]);
    setTitle("");
    setGroup("");
    setFrequency("daily");
    setGroupInputType("select");
    setIsExpanded(false);
  };

  const updateTodo = async (id: number, updates: Partial<Todo>) => {
    const res = await axios.patch(`${API_URL}${id}/`, updates);
    setTodos(todos.map((t) => (t.id === id ? res.data : t)));
  };

  const deleteTodo = async (id: number) => {
    await axios.delete(`${API_URL}${id}/`);
    setTodos(todos.filter((t) => t.id !== id));
  };

  const handleNoteChange = (id: number, text: string) => {
    setEditedNotes(prev => ({ ...prev, [id]: text }));
  };

  const saveNote = async (id: number) => {
    if (editedNotes[id] !== undefined) {
      await updateTodo(id, { notes: editedNotes[id] });
      setEditedNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[id];
        return newNotes;
      });
    }
    setEditingNoteId(null);
  };

  const cancelEdit = (id: number) => {
    setEditedNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[id];
      return newNotes;
    });
    setEditingNoteId(null);
  };

  const exportToCSV = () => {
    // Create CSV content
    const headers = ["ID", "Title", "Notes", "Status", "Date", "Group", "Frequency"];
    const csvContent = [
      headers.join(","),
      ...todos.map(todo => [
        todo.id,
        `"${todo.title.replace(/"/g, '""')}"`,
        todo.notes ? `"${todo.notes.replace(/"/g, '""')}"` : "",
        todo.status,
        todo.date,
        todo.group ? `"${todo.group.replace(/"/g, '""')}"` : "",
        todo.frequency
      ].join(","))
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tasks_export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleTodos = todos.filter((t) => {
    // Apply status filter
    if (filterStatus && t.status !== filterStatus) return false;
    
    // Apply frequency filter
    if (filterFrequency && t.frequency !== filterFrequency) return false;
    
    // Apply group filter
    if (filterGroup && t.group !== filterGroup) return false;
    
    // Apply date filter
    if (filterDate) {
      if (t.frequency === "daily" && t.date !== filterDate) return false;
      // Weekly and monthly tasks are not filtered by date
    } else {
      // No date filter applied - show today's daily tasks and all weekly/monthly tasks
      if (t.frequency === "daily" && t.date !== today) return false;
    }
    
    // Apply search filter
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !(t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    
    return true;
  });

  const statusIcons: Record<Todo["status"], JSX.Element> = {
    "not started": <Circle size={16} className="text-red-500" />,
    "pending": <PlayCircle size={16} className="text-orange-500" />,
    "completed": <CheckCircle size={16} className="text-green-500" />
  };

  const statusLabels: Record<Todo["status"], string> = {
    "not started": "Not Started",
    "pending": "In Progress",
    "completed": "Completed"
  };

  const getProgressWidth = (status: Todo["status"]) => {
    switch(status) {
      case "not started": return "w-0";
      case "pending": return "w-1/2";
      case "completed": return "w-full";
    }
  };

  const getProgressColor = (status: Todo["status"]) => {
    switch(status) {
      case "not started": return "bg-red-500";
      case "pending": return "bg-orange-500";
      case "completed": return "bg-green-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans text-gray-900 flex">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 bg-white shadow-lg flex-col p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
          <Settings size={20} />
          Task Manager
        </h2>
        
        <div className="mb-8">
          <h3 className="text-sm uppercase text-gray-500 font-semibold mb-3">Filters</h3>
          <div className="space-y-2">
            <button 
              className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition ${!filterStatus ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
              onClick={() => setFilterStatus("")}
            >
              <Filter size={16} />
              All Tasks
            </button>
            <button 
              className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition ${filterStatus === "not started" ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
              onClick={() => setFilterStatus("not started")}
            >
              <Circle size={16} className="text-red-500" />
              Not Started
            </button>
            <button 
              className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition ${filterStatus === "pending" ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
              onClick={() => setFilterStatus("pending")}
            >
              <PlayCircle size={16} className="text-orange-500" />
              In Progress
            </button>
            <button 
              className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition ${filterStatus === "completed" ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
              onClick={() => setFilterStatus("completed")}
            >
              <CheckCircle size={16} className="text-green-500" />
              Completed
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm uppercase text-gray-500 font-semibold mb-3">Groups</h3>
          <div className="space-y-2">
            <button 
              className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition ${!filterGroup ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
              onClick={() => setFilterGroup("")}
            >
              <Tag size={16} />
              All Categories
            </button>
            {groups.map((g) => (
              <button 
                key={g}
                className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition ${filterGroup === g ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                onClick={() => setFilterGroup(g)}
              >
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
            <h3 className="font-semibold mb-2">Productivity Stats</h3>
            <p className="text-sm opacity-90">
              {todos.filter(t => t.status === "completed").length} of {todos.length} tasks completed
            </p>
            <div className="h-2 bg-white bg-opacity-20 rounded-full mt-3">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500" 
                style={{ width: `${todos.length ? (todos.filter(t => t.status === "completed").length / todos.length) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full bg-gradient-to-br from-gray-50 to-gray-100 ">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-4 md:px-6 sticky top-0 z-10 w-full">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-bold text-gray-800">Daily Task Manager</h1>
            
            <div className="flex items-center gap-2 md:gap-4">
              <div className={`relative transition-all duration-300 ${isSearchFocused || searchQuery ? 'w-48 md:w-64' : 'w-10'}`}>
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-opacity duration-200 ${isSearchFocused || searchQuery ? 'opacity-100' : 'opacity-0'}`}>
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={isSearchFocused || searchQuery ? "Search tasks..." : ""}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all duration-200"
                />
                {(isSearchFocused || searchQuery) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                      searchRef.current?.blur();
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X size={16} className="text-gray-400 hover:text-gray-600 transition-colors" />
                  </button>
                )}
                {!isSearchFocused && !searchQuery && (
                  <button
                    onClick={() => {
                      setIsSearchFocused(true);
                      searchRef.current?.focus();
                    }}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center"
                  >
                    <Search size={18} className="text-gray-400" />
                  </button>
                )}
              </div>
              
              <button 
                onClick={exportToCSV}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                title="Export to CSV"
              >
                <Download size={18} />
              </button>
              
              <button 
                className="md:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="md:hidden bg-white p-4 border-b border-gray-200 shadow-sm w-full">
            <div className="grid grid-cols-2 gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="not started">Not Started</option>
                <option value="pending">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Categories</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              
              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value as "" | "daily" | "weekly" | "monthly")}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto p-4 md:p-6 w-full">
          {/* Add Task Card */}
          <div 
            className={`bg-white rounded-xl shadow-md mb-6 overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'} w-full`}
          >
            <form onSubmit={addTodo} ref={formRef} className="p-1">
              <div className="flex items-center p-3">
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-gray-100 transition mr-2"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                <input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  type="text"
                  placeholder="What needs to be done?"
                  className="flex-1 border-0 focus:ring-0 text-lg font-medium placeholder-gray-400 w-full"
                  onFocus={() => setIsExpanded(true)}
                />
                
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="ml-2 p-2 bg-blue-500 text-white rounded-full shadow-sm transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 w-full">
                      {groupInputType === "select" ? (
                        <>
                          <select
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            className="px-3 py-2 focus:outline-none w-full"
                          >
                            <option value="">Select Category...</option>
                            {groups.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                          <button 
                            type="button"
                            onClick={() => setGroupInputType("input")}
                            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 whitespace-nowrap border-l"
                          >
                            + New
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            type="text"
                            placeholder="Enter new group..."
                            className="px-3 py-2 focus:outline-none w-full"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              setGroupInputType("select");
                              setGroup("");
                            }}
                            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 whitespace-nowrap border-l"
                          >
                            ← Back
                          </button>
                        </>
                      )}
                    </div>
                    
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as "daily" | "weekly" | "monthly")}
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 w-full"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsExpanded(false);
                          setTitle("");
                          setGroup("");
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!title.trim()}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg shadow-sm transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Task
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Stats Toggle Button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 size={20} />
              Task Statistics
            </h2>
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showStats ? 'Hide Stats' : 'Show Stats'}
              {showStats ? <ChevronUp size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Stats Bar - Conditionally Rendered */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 w-full transition-all duration-300">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-gray-800">{todos.length}</div>
                <div className="text-sm text-gray-500">Total Tasks</div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">
                  {todos.filter(t => t.status === "not started").length}
                </div>
                <div className="text-sm text-gray-500">Not Started</div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-orange-600">
                  {todos.filter(t => t.status === "pending").length}
                </div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-green-600">
                  {todos.filter(t => t.status === "completed").length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="hidden md:flex items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm w-full">
            <span className="text-sm font-medium text-gray-600">Filters:</span>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="not started">Not Started</option>
              <option value="pending">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value as "" | "daily" | "weekly" | "monthly")}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Frequencies</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Categories</option>
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
            />
            
            {(filterStatus || filterFrequency || filterGroup || filterDate) && (
              <button
                onClick={() => {
                  setFilterStatus("");
                  setFilterFrequency("");
                  setFilterGroup("");
                  setFilterDate("");
                }}
                className="ml-auto text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                Clear filters
                <X size={14} />
              </button>
            )}
          </div>

          {/* Todo List */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden w-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>
              <span className="text-sm text-gray-500">{visibleTodos.length} items</span>
            </div>

            {visibleTodos.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-2">No tasks found</div>
                <p className="text-sm text-gray-500">Try changing your filters or adding a new task</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visibleTodos.map((todo) => (
                  <li
                    key={todo.id}
                    className="p-4 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          const nextStatus = todo.status === "not started" ? "pending" : 
                                           todo.status === "pending" ? "completed" : "not started";
                          updateTodo(todo.id, { status: nextStatus });
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {statusIcons[todo.status]}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${todo.status === "completed" ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                {todo.title}
                              </span>
                              
                              {todo.group && (
                                <span className="text-xs px-2 py-1 font-medium rounded-full bg-blue-50 text-blue-600">
                                  {todo.group}
                                </span>
                              )}
                            </div>
                            
                            {todo.notes && editingNoteId !== todo.id && (
                              <p className="text-sm text-gray-600 mb-2">{todo.notes}</p>
                            )}
                            
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {todo.frequency}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {todo.frequency === "daily" 
                                  ? new Date(todo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                  : todo.frequency === "weekly"
                                    ? "Weekly Task"
                                    : "Monthly Task"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                if (editingNoteId === todo.id) {
                                  saveNote(todo.id);
                                } else {
                                  setEditingNoteId(todo.id);
                                  setEditedNotes(prev => ({ ...prev, [todo.id]: todo.notes || "" }));
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                              <FileText size={16} />
                            </button>
                            
                            <button 
                              onClick={() => deleteTodo(todo.id)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(todo.status)}`}
                            style={{ width: `${getProgressWidth(todo.status).replace('w-', '').replace('1/2', '50')}%` }}
                          ></div>
                        </div>
                        
                        {/* Status label */}
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {statusLabels[todo.status]}
                          </span>
                          
                          <div className="text-xs text-gray-500">
                            {todo.status === "completed" ? "Done" : 
                             todo.status === "pending" ? "In progress" : "Not started"}
                          </div>
                        </div>
                        
                        {/* Note editor */}
                        {editingNoteId === todo.id && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg animate-fadeIn">
                            <textarea
                              placeholder="Add notes..."
                              value={editedNotes[todo.id] || ""}
                              onChange={(e) => handleNoteChange(todo.id, e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => cancelEdit(todo.id)}
                                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveNote(todo.id)}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg shadow-sm transition hover:bg-blue-600"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
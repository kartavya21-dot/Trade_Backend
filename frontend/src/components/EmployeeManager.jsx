import React, { useState, useEffect } from "react";

export default function EmployeeManager({ token }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [active, setActive] = useState(true);

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/employees", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("EMPLOYEE");
    setActive(true);
    setShowModal(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPassword(""); // Keep blank if unchanged
    setRole(emp.role);
    setActive(emp.active);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const url = editingEmployee ? `/employees/${editingEmployee.id}` : "/employees";
    const method = editingEmployee ? "PUT" : "POST";
    
    const payload = {
      name,
      email,
      role,
      active
    };
    
    // Only send password if provided or creating new
    if (password) payload.password = password;
    else if (!editingEmployee) {
      setError("Password is required for new employees.");
      return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Operation failed");
      }

      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    setError("");
    try {
      const res = await fetch(`/employees/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex-1 bg-darkbg p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Employee Accounts</h2>
          <p className="text-gray-400 text-xs mt-0.5">Manage operator credentials, roles, and active statuses</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-accentTeal to-accentViolet text-darkbg font-bold px-4 py-2 rounded-xl text-xs shadow-lg hover:opacity-90 transition-opacity"
        >
          Add Employee
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-lg p-3 text-xs mb-6">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <svg className="animate-spin h-6 w-6 text-accentTeal" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="bg-cardbg border border-cardborder rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-darkbg/45 text-gray-400 font-bold border-b border-cardborder">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardborder text-gray-300">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-darkbg/10">
                  <td className="p-4 font-semibold text-white">{emp.name}</td>
                  <td className="p-4 font-mono">{emp.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      emp.role === "ADMIN" 
                        ? "bg-purple-950/60 border border-purple-800/40 text-purple-300"
                        : "bg-teal-950/60 border border-teal-800/40 text-teal-300"
                    }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      emp.active 
                        ? "bg-green-950/60 border border-green-800/40 text-green-300"
                        : "bg-red-950/60 border border-red-800/40 text-red-300"
                    }`}>
                      {emp.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(emp)}
                      className="text-accentTeal hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No employees registered. Add one using the button above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-cardbg border border-cardborder rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-4">
              {editingEmployee ? "Edit Employee Account" : "Add Employee Account"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-accentTeal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-accentTeal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Password {editingEmployee && <span className="text-gray-500 normal-case">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  required={!editingEmployee}
                  className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-accentTeal"
                  value={password}
                  placeholder={editingEmployee ? "••••••••" : ""}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-accentTeal"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-accentTeal"
                    value={active ? "true" : "false"}
                    onChange={(e) => setActive(e.target.value === "true")}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-cardborder">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-cardborder text-gray-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-darkbg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-accentTeal to-accentViolet text-darkbg font-bold px-4 py-2 rounded-xl text-xs hover:opacity-90 transition-opacity"
                >
                  {editingEmployee ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

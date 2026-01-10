import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

export default function ManageMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", nrp: "" });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("members").select("*").order("name", { ascending: true });

    if (error) console.error("Error fetching members:", error);
    else setMembers(data || []);
    setLoading(false);
  };

  const handleOpenModal = (member = null) => {
    setEditingMember(member);
    setFormData({ name: member ? member.name : "", nrp: member ? member.nrp : "" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setFormData({ name: "", nrp: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.nrp) {
      setFormError("Name and NRP are required.");
      return;
    }

    try {
      if (editingMember) {
        // Update
        const { error } = await supabase.from("members").update({ name: formData.name, nrp: formData.nrp }).eq("id", editingMember.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("members").insert([{ name: formData.name, nrp: formData.nrp }]);
        if (error) throw error;
      }

      handleCloseModal();
      fetchMembers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;

    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) {
      alert("Error deleting member: " + error.message);
    } else {
      fetchMembers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Manage Members</h1>
        <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md transition">
          <Plus size={18} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-light">
            <thead className="bg-slate-700 text-slate-300">
              <tr>
                <th className="p-4 uppercase text-xs font-semibold tracking-wider">Name</th>
                <th className="p-4 uppercase text-xs font-semibold tracking-wider">NRP</th>
                <th className="p-4 uppercase text-xs font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-slate-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-750/50">
                    <td className="p-4 text-white font-medium">{member.name}</td>
                    <td className="p-4 text-slate-300">{member.nrp}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(member)} className="text-blue-400 hover:text-blue-300 p-1 hover:bg-slate-700 rounded transition">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(member.id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-slate-700 rounded transition">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{editingMember ? "Edit Member" : "Add New Member"}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {formError && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{formError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">NRP</label>
                <input
                  type="text"
                  value={formData.nrp}
                  onChange={(e) => setFormData({ ...formData, nrp: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="12345678"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition">
                  Cancel
                </button>
                <button type="submit" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition">
                  <Save size={18} />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

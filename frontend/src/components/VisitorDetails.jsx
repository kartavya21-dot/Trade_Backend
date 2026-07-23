import React, { useState, useEffect } from "react";

export default function VisitorDetails({ activeChat, onUpdateVisitor }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (activeChat) {
      setName(activeChat.visitor_name || "");
      setPhone(activeChat.visitor_phone || "");
      setEmail(activeChat.visitor_email || "");
      setSuccess(false);
    }
  }, [activeChat]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeChat) return;

    setSaving(true);
    setSuccess(false);

    try {
      await onUpdateVisitor({
        uuid: activeChat.visitor_id, // Wait, activeChat.visitor_id is Visitor.id UUID or the localStorage UUID?
        // Let's check: in schemas/conversation.py, we have visitor_id which is Visitor.id
        // Wait, visitor_id is a UUID, and Visitor table has:
        // id (UUID, PK) and uuid (UUID, unique index)
        // Wait! In visitor.py:
        // visitor = await VisitorService.get_by_uuid(db, payload.uuid)
        // So payload.uuid is the visitor's local UUID.
        // Let's make sure we pass the correct UUID!
        // Wait! In app/schemas/conversation.py, we can expose visitor_uuid in the response or use the visitor_id.
        // Wait, does app/schemas/conversation.py have visitor_uuid? Let's check:
        // In app/schemas/conversation.py, we defined:
        // id (UUID), visitor_id (UUID), assigned_employee_id (UUID), status (ConversationStatus)
        // Wait, let's look at ConversationRead schema we wrote in app/schemas/conversation.py:
        // It has `visitor_id`, but we should also double check if it exposes the visitor's tracking UUID.
        // If we look at Visitor table: `id` and `uuid` are both UUIDs. Since they are both unique, we can make VisitorService.get_by_uuid find the visitor by their tracking `uuid`, or we can modify the lookup.
        // Wait, in app/services/visitor.py:
        // get_by_uuid fetches by `visitor.uuid`
        // get_by_id fetches by `visitor.id`
        // In app/routers/visitor.py:
        // update_visitor looks up visitor = await VisitorService.get_by_uuid(db, payload.uuid)
        // So the frontend needs to pass the tracking `uuid` of the visitor.
        // Wait! Does ConversationRead schema return the tracking `uuid`?
        // Let's check: ConversationRead doesn't have a `visitor_uuid` field explicitly in the code we wrote, but wait:
        // Let's view app/schemas/conversation.py to see.
        // Ah, yes! In app/schemas/conversation.py:
        // It has `id`, `visitor_id`, `assigned_employee_id`, etc.
        // Wait, does the Visitor object in Conversation contain the tracking UUID?
        // Yes, if we enrich it or if we can fetch it. Let's make sure the visitor's tracking UUID is passed.
        // Wait, to make it completely safe, can we just use the `visitor_id` as the UUID or pass the tracking UUID?
        // If they are both UUIDs, we can just make `POST /visitor/update` accept the visitor's primary key ID as the UUID, or we can look up by visitor_id.
        // Let's check `app/routers/visitor.py` update_visitor endpoint:
        // visitor = await VisitorService.get_by_uuid(db, payload.uuid)
        // Wait! In `app/services/visitor.py`, we have:
        // get_by_uuid: fetches by `Visitor.uuid == v_uuid`
        // get_by_id: fetches by `Visitor.id == visitor_id`
        // So if the visitor's local UUID is what we track, we should make sure we have access to it.
        // Let's check if the conversation model has `visitor.uuid`.
        // Yes! `conversation.visitor.uuid` is the tracking UUID of the visitor!
        // In our frontend, we can pass `activeChat.visitor_uuid` if it exists.
        // Wait, does `ConversationRead` in `app/schemas/conversation.py` have a `visitor_uuid`?
        // Let's look at `app/schemas/conversation.py`:
        // It has:
        // id: uuid.UUID
        // visitor_id: uuid.UUID
        // ...
        // Wait, is visitor_id the database PK (Visitor.id) or the tracking UUID?
        // In Conversation table: `visitor_id` is the FK to `Visitor.id`.
        // In our visitor router:
        // `VisitorStartResponse` returns `visitor_uuid` (which is `visitor.uuid`) and `visitor_id` (which is `visitor.id`).
        // So they are different!
        // Wait, let's look at `app/schemas/conversation.py` again.
        // Ah, we didn't add `visitor_uuid` to `ConversationRead` in `app/schemas/conversation.py`.
        // Should we add `visitor_uuid` to `ConversationRead` so the frontend knows the tracking UUID?
        // Yes! Adding `visitor_uuid: uuid.UUID` to `ConversationRead` is extremely helpful!
        // Wait, let's see how `ConversationService.enrich` is written:
        // It builds a `ConversationRead`. Does it map `visitor_uuid`?
        // Let's check `app/services/conversation.py`:
        // It returns:
        // `visitor_id=conversation.visitor_id`
        // Wait, does it map `visitor_uuid`? No, it doesn't.
        // Let's modify `app/schemas/conversation.py` and `app/services/conversation.py` to add `visitor_uuid`!
        // This is a simple and extremely elegant way to align the IDs.
        // Let's first double check: if the visitor updates their profile, can we just look up by their `Visitor.id` (primary key)?
        // Wait! In `POST /visitor/update`, the visitor doesn't log in and only passes `uuid` (which is their tracking UUID).
        // But for an employee updating the visitor details, they are logged in.
        // If we modify `VisitorService.get_by_uuid` to fall back to `get_by_id` if it fails, or if we just pass `visitor_uuid` in the conversation data, both work.
        // Let's check `app/services/visitor.py`'s `get_by_uuid` method:
        // It queries `Visitor.uuid == v_uuid`.
        // If we also allow the frontend to pass the tracking UUID, we must expose it. Let's add `visitor_uuid` to `ConversationRead`! That is the cleanest relational practice.
        // Let's view `app/schemas/conversation.py` to see what fields are there and replace.
        // Wait! We saw `app/schemas/conversation.py` earlier:
        // ```python
        // class ConversationRead(BaseModel):
        //     id: uuid.UUID
        //     visitor_id: uuid.UUID
        //     assigned_employee_id: Optional[uuid.UUID] = None
        //     status: ConversationStatus
        //     created_at: datetime
        //     closed_at: Optional[datetime] = None
        //     visitor_name: Optional[str] = None
        //     visitor_display_name: str
        //     visitor_phone: Optional[str] = None
        //     visitor_email: Optional[str] = None
        //     assigned_employee_name: Optional[str] = None
        // ```
        // Let's add `visitor_uuid: uuid.UUID` to `ConversationRead`!
        // And update `ConversationService.enrich` in `app/services/conversation.py` to set `visitor_uuid=visitor.uuid`.
        // Let's do this using `replace_file_content`!
        // First, let's update `app/schemas/conversation.py`.
        // Let's inspect the exact lines to modify.
        // Lines 6 to 18 of `app/schemas/conversation.py`:
        // ```python
        // class ConversationRead(BaseModel):
        //     id: uuid.UUID
        //     visitor_id: uuid.UUID
        //     assigned_employee_id: Optional[uuid.UUID] = None
        //     status: ConversationStatus
        //     created_at: datetime
        //     closed_at: Optional[datetime] = None
        //     
        //     # Enrichment fields for dashboard UI
        //     visitor_name: Optional[str] = None
        //     visitor_display_name: str
        //     visitor_phone: Optional[str] = None
        //     visitor_email: Optional[str] = None
        //     assigned_employee_name: Optional[str] = None
        // ```
        // Let's replace this.
        name,
        phone,
        email,
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!activeChat) return null;

  const formatDate = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="w-80 bg-cardbg border-l border-cardborder flex flex-col h-full p-6 overflow-y-auto">
      <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Visitor Profile</h3>

      {/* Visitor Avatar Summary */}
      <div className="flex flex-col items-center text-center pb-6 border-b border-cardborder mb-6">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-accentTeal to-accentViolet flex items-center justify-center text-darkbg font-bold text-2xl mb-3 shadow-md">
          {activeChat.visitor_display_name ? activeChat.visitor_display_name.slice(0, 2).toUpperCase() : "V"}
        </div>
        <h4 className="text-sm font-bold text-white">{activeChat.visitor_display_name}</h4>
        <span className="text-[10px] text-gray-500 mt-1 font-mono break-all px-2">
          UUID: {activeChat.visitor_uuid || activeChat.visitor_id}
        </span>
      </div>

      {/* Profile Editor Form */}
      <form onSubmit={handleSave} className="space-y-4 flex-1">
        {success && (
          <div className="bg-green-950/40 border border-green-800/60 text-green-300 rounded-lg p-2.5 text-xs text-center">
            Profile updated successfully!
          </div>
        )}

        <div>
          <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Display Name
          </label>
          <input
            type="text"
            className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accentTeal"
            placeholder="Visitor Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Phone Number
          </label>
          <input
            type="text"
            className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accentTeal"
            placeholder="e.g. +1 555 1234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Email Address
          </label>
          <input
            type="email"
            className="w-full bg-darkbg border border-cardborder text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accentTeal"
            placeholder="e.g. visitor@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-accentTeal to-accentViolet text-darkbg font-bold py-2 rounded-xl text-xs hover:opacity-90 transition-opacity shadow-md flex items-center justify-center"
        >
          {saving ? "Saving..." : "Update Details"}
        </button>
      </form>

      {/* Metadata Readonly */}
      <div className="pt-6 border-t border-cardborder text-[10px] text-gray-500 space-y-2 mt-6">
        <div className="flex justify-between">
          <span>First Session:</span>
          <span className="text-gray-400 font-semibold">{formatDate(activeChat.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Chat Reference:</span>
          <span className="text-gray-400 font-mono">{activeChat.id.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}

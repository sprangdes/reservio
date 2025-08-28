import React, { useState } from "react";
import { createUser } from "../api/userApi";

export default function UserCreateForm() {
    const [lineUserId, setLineUserId] = useState("");
    const [roleId, setRoleId] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await createUser({ lineUserId, roleId: Number(roleId) });
            setMessage({ type: "success", text: "✅ 使用者建立成功" });
            setLineUserId("");
            setRoleId("");
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Line User ID */}
            <div>
                <label className="block text-gray-700 mb-1">Line User ID</label>
                <input
                    type="text"
                    value={lineUserId}
                    onChange={(e) => setLineUserId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring focus:ring-blue-300 focus:outline-none"
                    placeholder="輸入 Line User ID"
                    required
                />
            </div>

            {/* Role ID */}
            <div>
                <label className="block text-gray-700 mb-1">角色 ID</label>
                <input
                    type="number"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring focus:ring-blue-300 focus:outline-none"
                    placeholder="輸入角色 ID"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl hover:bg-blue-700 transition disabled:bg-gray-400"
            >
                {loading ? "建立中..." : "建立使用者"}
            </button>

            {message && (
                <div
                    className={`mt-4 p-3 rounded-lg ${
                        message.type === "success"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                    }`}
                >
                    {message.text}
                </div>
            )}
        </form>
    );
}
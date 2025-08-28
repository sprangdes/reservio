import React from "react";
import UserCreateForm from "../components/UserCreateForm";

export default function UserCreatePage() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">新增使用者</h2>
                <UserCreateForm />
            </div>
        </div>
    );
}
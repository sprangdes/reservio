// src/App.js
import React from "react";

function App() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    React + Tailwind 練習
                </h1>
                <p className="text-gray-600 mb-6">
                    恭喜！你的專案已經可以開始開發了 🚀
                </p>
                <button
                    className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                    onClick={() => alert("Hello from React!")}
                >
                    點我試試
                </button>
            </div>
        </div>
    );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import UserCreatePage from "./pages/UserCreatePage";

function App() {
    return (
        <Router>
            <nav className="bg-blue-600 p-4 text-white">
                <Link to="/user/new" className="mr-4">
                    新增使用者
                </Link>
            </nav>
            <Routes>
                <Route path="/user/new" element={<UserCreatePage />} />
            </Routes>
        </Router>
    );
}

export default App;

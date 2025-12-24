import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth(); // Context se dono cheezein le li

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    // Agar user logged in nahi hai, to usay AuthPage (/) par bhej do
    return <Navigate to="/" replace />;
  }

  // Agar user hai, to usay wo page dikhao jo wo kholna chahta hai
  return children;
};

export default ProtectedRoute;

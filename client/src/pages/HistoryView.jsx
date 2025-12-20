import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // ⚠️ Path check kar lena agar error aye
import { Loader, ArrowLeft } from "lucide-react";

const HistoryView = () => {
  const { id } = useParams(); // URL se ID nikalne ke liye (e.g., 123)
  const navigate = useNavigate();
  
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 👇 Data Fetch Karne Ka Logic
  useEffect(() => {
    const fetchChat = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!id) return;

        // Firebase se specific document lana
        const docRef = doc(db, "chats", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setChatData(docSnap.data());
        } else {
          setError("Chat not found!");
        }
      } catch (err) {
        console.error("Error fetching chat:", err);
        setError("Error loading chat history.");
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [id]);

  // 👇 Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <Loader className="animate-spin mr-2" /> Loading chat...
      </div>
    );
  }

  // 👇 Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-red-400">
        <p className="text-xl mb-4">{error}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-gray-800 px-4 py-2 rounded text-white hover:bg-gray-700 border border-gray-600"
        >
          Go Back to Dashboard
        </button>
      </div>
    );
  }

  // 👇 Main Content (Jab Data Aa Jaye)
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white p-6 overflow-y-auto">
      
      {/* Header Area */}
      <div className="flex items-center mb-6 border-b border-gray-700 pb-4">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="mr-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{chatData?.title || "Untitled Chat"}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Created at: {chatData?.createdAt?.toDate ? chatData.createdAt.toDate().toLocaleString() : "Date unknown"}
          </p>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
        
        {/* User Prompt Section */}
        <div className="mb-8">
          <h3 className="text-blue-400 font-semibold mb-2 uppercase text-xs tracking-wider">Your Prompt:</h3>
          <div className="bg-gray-900/50 p-4 rounded border-l-4 border-blue-500 text-gray-200">
            {chatData?.prompt || "No prompt available"}
          </div>
        </div>

        {/* AI Response / Diagram Code Section */}
        <div>
          <h3 className="text-green-400 font-semibold mb-2 uppercase text-xs tracking-wider">Diagram Code:</h3>
          <pre className="bg-black p-4 rounded border border-gray-700 overflow-x-auto font-mono text-sm text-green-300 shadow-inner">
            {chatData?.response || chatData?.diagramCode || "No code generated."}
          </pre>
        </div>

      </div>
    </div>
  );
};

export default HistoryView;

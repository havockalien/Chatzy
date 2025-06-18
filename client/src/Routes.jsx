import AuthForm from "./AuthForm";
import { useContext } from "react";
import { UserContext } from "./UserContext";
import Chat from "./Chat1.jsx";
export default function Routes() {
  const { username } = useContext(UserContext);

  if (username) {
    // return (
    //   <div className="h-screen flex items-center justify-center bg-green-100 text-center">
    //     <div>
    //       <h2 className="text-xl font-semibold text-green-700">✅ Logged in!</h2>
    //       <p className="text-green-800">Username: <strong>{username}</strong></p>
    //       <p className="text-green-800">User ID: <strong>{id}</strong></p>
    //       <button
    //         onClick={() => {
    //           setUsername(null);
    //           setId(null);
    //         }}
    //         className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
    //       >
    //         Logout
    //       </button>
    //     </div>
    //   </div>
    // );
    return(
        <Chat />
    );
  }

  return <AuthForm />;
}

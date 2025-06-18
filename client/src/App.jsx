import axios from "axios";
import { UserContextProvider } from "./UserContext";
import { AuthTypeProvider } from "./AuthTypeContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = 'http://localhost:4040';
  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <AuthTypeProvider>
        <Routes />
      </AuthTypeProvider>
    </UserContextProvider>
  );
}

export default App;

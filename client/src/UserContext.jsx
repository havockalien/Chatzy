import axios from 'axios';
import { createContext, useEffect, useState } from 'react';

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [id, setId] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/profile');
        console.log('Profile data:', res.data);
        setUsername(res.data.username);
        setId(res.data.id);
      } catch (err) {
        if (err.response?.status === 401) {
          // Not logged in — expected case, don't crash or log as error
          console.log("User not logged in yet.");
        } else {
          console.error("❌ Unexpected error while fetching profile:", err);
        }
      }
    };

    fetchProfile();
  }, []);

  return (
    <UserContext.Provider value={{ username, setUsername, id, setId }}>
      {children}
    </UserContext.Provider>
  );
}

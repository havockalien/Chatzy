import { createContext, useState } from "react";

export const AuthTypeContext = createContext();

export function AuthTypeProvider({ children }) {
  const [isLoginorRegister, setIsLoginOrRegister] = useState('register');

  return (
    <AuthTypeContext.Provider value={{ isLoginorRegister, setIsLoginOrRegister }}>
      {children}
    </AuthTypeContext.Provider>
  );
}

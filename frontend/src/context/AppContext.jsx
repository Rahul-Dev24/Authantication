import { createContext, useContext, useEffect, useState } from "react";
import api from "../apiInterseptor";
import { toast } from "react-toastify";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);

    async function fetchUser() {
        try {
            setLoading(true);
            const { data } = await api.get(`/api/v1/me`, { withCredentials: true });
            setUser(data?.user);
            setIsAuth(true);
        } catch (err) {
            setUser(null);
            setIsAuth(false);
        } finally {
            setLoading(false);
        }
    }

    async function logoutUser(navicate) {
        try {
            const { data } = await api.post("/api/v1/logout");
            toast.success(data?.message);
            setIsAuth(false);
            setUser(null);
            navicate("/login");
        } catch (err) {
            toast.error("Something went wrong")
        }
    }

    useEffect(() => {
        fetchUser();
    }, [])

    return <AppContext.Provider value={{
        user,
        setIsAuth,
        isAuth,
        loading,
        setUser,
        logoutUser
    }}>{children}</AppContext.Provider>
}


export const AppData = () => {
    const context = useContext(AppContext);

    if (!context) throw new Error("App Data must be used with an AppProvider");

    return context;

}
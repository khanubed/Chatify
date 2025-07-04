import { Children, createContext, useEffect , useState} from "react";
import  axios  from "axios";
import toast from "react-hot-toast";
import {io} from "socket.io-client"


const backendURL = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendURL

export const AuthContext = createContext()  

export const AuthProvider = ({children}) => {

    const [token, setToken] = useState(localStorage.getItem("token"))
    const [authUser, setAuthUser] = useState(null)
    const [onlineUsers, setOnlineUsers] = useState([])
    const [socket, setSocket] = useState(null)

    // Function to check if user is authenticated and if so , then set the userData and connect the socket
    const authCheck = async () => {
        try {
            const {data} = await axios.get("/api/auth/check");
            if(data.success){
                setAuthUser(data.user)
                connectSocket(data.user)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    //Login funtion to handle user auth and socket connection

    const login = async (state , credentials) => {
        try {
            const {data} = await axios.post(`/api/auth/${state}`, credentials)
            if(data.success){
                setAuthUser(data.userData);
                connectSocket(data.userData)
                axios.defaults.headers.common["token"] = data.token;
                setToken(data.token)
                localStorage.setItem("token",data.token)
                toast.success(data.message)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(data.message)
        }
    }

    //Logout function to handle use logout and socket disconnection
    const logout = async () => {
        localStorage.removeItem("token");
        setToken(null)
        setAuthUser(null)
        setOnlineUsers([]);
        axios.defaults.headers.common["token"]=null;
        toast.success("Logged out successfully")
        socket.disconnect();
    }

    //Function to update the user profile
    const editProfile = async (body)=>{
        try {
            const {data} = await axios.put("/api/auth/edit-profile",body)
            if (data.success) {
                setAuthUser(data.user)
                toast.success("Profile edited successfully")
            }
        } catch (error) {
            toast.error(error.message)    
        }
    }

    //Connect socket function to handle socket connection and online users updates

    const connectSocket = (userData)=>{
        if (!userData||socket?.connected) {
            return ;
        }
        const newSocket = io(backendURL, {
            query: {
                userId : userData._id,
            }
        })
        newSocket.connect();
        setSocket(newSocket);

        newSocket.on("getOnlineUsers",(userIds)=>{
            setOnlineUsers(userIds);
        })
    }

    useEffect(()=>{
        if(token){
            axios.defaults.headers.common["token"]=token;
        }
        authCheck();
    },[token])

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        editProfile,
        logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
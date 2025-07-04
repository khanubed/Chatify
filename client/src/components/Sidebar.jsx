import React, { useState , useEffect } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ChatContext } from '../../context/ChatContext';
 
const Sidebar = () => {
    const {getUsers ,  users , selectedUser ,setSelectedUser, unseenMessages , setUnseenMessages} = useContext(ChatContext)

    const {logout , onlineUsers} = useContext(AuthContext)
    const [search , setSearch]=useState('')

    const navigate = useNavigate();

    const filteredUsers = search ? users.filter((user)=>user.fullName.toLowerCase().includes(search.toLowerCase())) : users

    useEffect(() => {
      getUsers()
    }, [onlineUsers])
    

  return (
    <div className={`bg-[#8196b2]/10 h-full p-5  overflow-y-scroll ${selectedUser ? "max-md:hidden" : ""}`}>
      <div className='pb-5'>  
        <div className='flex justify-between items-center'>
          <img src={assets.logo} alt="logo" className='max-w-40' />
          <div className='relative py-2 group'> 
            <img src={assets.menu_icon} alt="Menu" className='max-h-5 cursor-pointer' />
            <div className='absolute top-full right-0 z-20 w-32 rounded-md bg-[#212b42] p-5 border-gray-600 text-gray-100 hidden group-hover:block'>
              <p onClick={()=>navigate('/profile')} className='cursor-pointer text-sm'>Edit Profile</p>
              <hr className='my-2 border-t border-gray-500' />
              <p className='cursor-pointer text-sm' onClick={()=>logout()}>Logout</p>
            </div>
          </div>
        </div>
        <div className='bg-[#2d323d]  rounded-full flex items-center gap-2 mt-5 py-3 px-4 '>
          <img src={assets.search_icon} alt="Search"  className='w-3'/>
          <input type="text" onChange={(e)=>setSearch(e.target.value)} className='bg-transparent border-none outline-none text-xs placeholder-[#c8c8c8] flex-1' placeholder='Search User'/>
        </div>
      </div>
      <div className='flex flex-col'>
        {filteredUsers.map((user,index)=>(
          <div onClick={()=>{setSelectedUser(user);setUnseenMessages((prev)=>({...prev,[user._id]:0}))}}   
          key={index} className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm
           ${selectedUser?._id===user._id ? 'bg-[#212b42]/50' : ''}`}>
            <img src={user?.profilePic || assets.avatar_icon} alt="" className='w-[35px] aspect-square rounded-full' />
            <div className='flex flex-col leading-5'>
              <p>{user.fullName}</p>
              {
                onlineUsers?.includes(user._id)
                ? <span className='text-xs text-green-400'>Online</span>
                : <span className='text-xs text-neutral-400'>Offline</span>
              }
            </div>
            {unseenMessages[user._id] > 0 && <p className='absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-blue-500/5'>{unseenMessages[user._id]}</p> }
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
import React, {useContext, useEffect, useRef ,useState} from 'react'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { AuthContext } from '../../context/AuthContext'
import { ChatContext } from '../../context/ChatContext'
import toast from 'react-hot-toast'

const ChatContainer = () => {
    const { authUser , onlineUsers } = useContext(AuthContext)
    const { messages , selectedUser , setSelectedUser ,sendMessage , getMessages } = useContext(ChatContext)

    const [input, setInput] = useState("")
    
    const scrollEnd = useRef()

    //Handling message send
    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (input.trim()==="") return null;
      await sendMessage({text : input.trim()})
      setInput("")
    }

    

    const handleSendImage = async (e) => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
     }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(",")[1]; // remove any existing prefix
      const base64Image = `data:${file.type};base64,${base64}`; // add proper prefix

      console.log("Sending image base64:", base64Image.slice(0, 50)); // debug

      await sendMessage({ image: base64Image });
      e.target.value = ""; // reset input
    };
     reader.readAsDataURL(file); // this will include the prefix
  };
    useEffect(()=>{
        if (selectedUser?._id) {
          getMessages(selectedUser._id)
        }
      },[selectedUser?._id, messages])

    useEffect(() => {
      if (scrollEnd.current && messages) {
        scrollEnd.current.scrollIntoView({behavior : "smooth"})
      }
    }, [messages])
    

  return selectedUser ? (
    <div className='h-full overflow-scroll relative backdrop-blur-lg'>
      {/* -------Header--------- */}
      <div className='flex items-center gap-3 mx-4 border-b border-stone-500'>
        <img src={selectedUser.profilePic || assets.avatar_icon} alt="" className=' w-8 aspect-square rounded-full my-2' />
        <p className='flex-1 text-lg flex items-center gap-2 '>{selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && <span className='w-2 h-2 rounded-full bg-green-500'></span>}
          
        </p>
        <img  onClick={()=> setSelectedUser(null)} src={assets.arrow_icon} className='md:hidden max-w-7' alt="" />
      </div>
      {/* -------Chat Area-------- */}
      <div className='flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6'>
        {messages.map((msg,index)=> (
          <div key={index} className={`flex items-end  justify-end ${msg.senderId !== authUser._id && 'flex-row-reverse'}`} >
            {msg.image ? (
              <img src={msg.image} alt="" className='max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8' />
            ):(
              <p className={`max-w-[230px] md:text-sm  font-light px-3 py-2 mb-8 break-all bg-blue-500/30 rounded-lg ${msg.senderId === authUser._id ? 'rounded-br-none': 'rounded-bl-none'}`}>{msg.text}</p>
            )}

            <div className='text-center text-xs'>
              <img src={msg.senderId === authUser._id ? authUser?.profilePic || assets.avatar_icon  : selectedUser?.profilePic || assets.avatar_icon} alt="" className='w-7 aspect-square rounded-full' />
              <p className='text-gray-500'>{formatMessageTime(msg.createdAt)}</p>
            </div>
            
          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>


      {/* -------- Bottom Area -------- */}

      <div className='absolte bottom-0 left-0 right-0 flex items-center gap-3 p-3'>
        <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full '>
          <input onChange={(e)=>setInput(e.target.value)} value={input} onKeyDown={(e)=> e.key==="Enter"? handleSendMessage(e) : null} type="text" name="" placeholder='Send a message' className='flex-1 text-sm p-3 border-none rounded-lg outline-none placeholder-gray-400' id="" />
          <input onChange={handleSendImage} type="file" name=""  id="image" accept='image/png , image/jpeg' hidden/>
          <label htmlFor="image">
            <img src={assets.gallery_icon} alt="" className='w-5 mr-2 cursor-pointer'/>
          </label>
        </div>
        <img onClick={handleSendMessage} src={assets.send_button} alt="" className='w-10 cursor-pointer'/>
      </div>
    </div>
  ) : (
    <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>
      <img src={assets.logo_icon} alt="" className='max-w-16'/>
      <p className='text-lg font-medium'>Chatify — Connect. Converse. Collaborate</p>
    </div>
  )
}

export default ChatContainer
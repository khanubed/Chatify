import API from "../api/axios";

export const chatService = {
  async fetchUsers() {
    const { data } = await API.get("/messages/users");
    return data;
  },

  async fetchMessages(targetId, isGroupChat = false) {
    const { data } = await API.get(`/messages/${targetId}?isGroup=${isGroupChat}`);
    return data;
  },

  async uploadAsset(fileAsset) {
    const uploadFormData = new FormData();
    uploadFormData.append("file", fileAsset);

    const { data } = await API.post("/messages/upload-asset", uploadFormData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
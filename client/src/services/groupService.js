import API from "../api/axios";

export const groupService = {
  async fetchGroups() {
    const { data } = await API.get("/groups/all");
    return data;
  },

  async create(groupData) {
    const { data } = await API.post("/groups/create", groupData);
    return data;
  },

  async addMember(groupId, userId) {
    const { data } = await API.post(`/groups/${groupId}/add`, { userId });
    return data;
  },

  async fetchNonMembers(groupId) {
    const { data } = await API.get(`/groups/${groupId}/non-members`);
    return data;
  },

  async leave(groupId) {
    return await API.patch(`/groups/${groupId}/leave`);
  },

  async toggleBlockUser(userId) {
    const { data } = await API.patch(`/auth/block/${userId}`);
    return data;
  },

  async requestJoin(groupId) {
    const { data } = await API.post(`/groups/request/${groupId}`);
    return data;
  },

  async resolveRequest(groupId, applicantId, action) {
    const { data } = await API.post(`/groups/resolve-request`, {
      groupId,
      applicantId,
      action,
    });
    return data;
  },
};
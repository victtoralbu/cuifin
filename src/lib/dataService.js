import { supabase } from './supabaseClient';

export const dataService = {
  // --- TRANSACTIONS ---
  async getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    // Map snake_case from DB to camelCase used in app
    return data.map(t => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      amount: parseFloat(t.amount),
      title: t.title,
      emoji: t.emoji,
      dueDate: t.due_date,
      status: t.status,
      splitWith: t.split_with || [],
      installments: t.installments,
      groupId: t.group_id
    }));
  },

  async addTransaction(transaction) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        type: transaction.type,
        amount: transaction.amount,
        title: transaction.title,
        emoji: transaction.emoji,
        due_date: transaction.dueDate,
        status: transaction.status,
        split_with: transaction.splitWith,
        installments: transaction.installments,
        group_id: transaction.groupId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTransaction(id, updates) {
    const dbUpdates = {};
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.emoji) dbUpdates.emoji = updates.emoji;
    if (updates.dueDate) dbUpdates.due_date = updates.dueDate;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.splitWith) dbUpdates.split_with = updates.splitWith;
    if (updates.installments) dbUpdates.installments = updates.installments;
    if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;

    const { data, error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTransaction(id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // --- SHOPPING LIST ---
  async getShoppingItems() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get lists shared with the user
    const { data: shares, error: sharesError } = await supabase
      .from('shopping_shares')
      .select('owner_id')
      .eq('collaborator_id', user.id);

    if (sharesError) throw sharesError;

    const ownerIds = [user.id, ...(shares?.map(s => s.owner_id) || [])];

    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .in('user_id', ownerIds)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addShoppingItem(item) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('shopping_items')
      .insert([{
        user_id: user.id,
        name: item.name,
        emoji: item.emoji,
        quantity: item.quantity,
        price: item.price,
        bought: item.bought || false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateShoppingItem(id, updates) {
    const { data, error } = await supabase
      .from('shopping_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteShoppingItem(id) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async finalizeShoppingList() {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('bought', true);
    
    if (error) throw error;
  },

  // --- SOCIAL: FRIENDS & INVITES ---
  async getFriends() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get friends where user is either user_id or friend_id
    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendsError) throw friendsError;
    if (!friendsData || friendsData.length === 0) return [];

    // Get unique friend IDs (excluding the current user)
    const friendIds = [...new Set(friendsData.map(f => 
      f.user_id === user.id ? f.friend_id : f.user_id
    ))];

    if (friendIds.length === 0) return [];

    // Fetch profiles for those IDs
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', friendIds);

    if (profilesError) throw profilesError;

    return profiles.map(p => ({
      id: p.id,
      name: p.full_name,
      avatar: p.avatar_url,
      email: p.email
    }));
  },

  async addFriendByEmail(email) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (user.email === email) throw new Error('Você não pode adicionar a si mesmo!');

    // Find profile by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      throw new Error('Usuário não encontrado com este e-mail');
    }

    // Add friendship both ways
    const { error: friendError } = await supabase
      .from('friends')
      .upsert([
        { user_id: user.id, friend_id: profile.id },
        { user_id: profile.id, friend_id: user.id }
      ], { onConflict: 'user_id,friend_id' });

    if (friendError) throw friendError;
    return profile;
  },

  async addFriendByInvite(inviterId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (user.id === inviterId) return; // Can't friend yourself

    const { error } = await supabase
      .from('friends')
      .upsert([
        { user_id: inviterId, friend_id: user.id },
        { user_id: user.id, friend_id: inviterId }
      ], { onConflict: 'user_id,friend_id' });

    if (error) throw error;
  },

  async searchUsers(query) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    if (error) throw error;
    return data.map(p => ({
      id: p.id,
      name: p.full_name,
      avatar: p.avatar_url,
      email: p.email
    }));
  },

  // --- GROUPS ---
  async getGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(*)
      `)
      // Removed .eq('user_id', user.id) to allow members to see groups they are part of
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addGroup(name) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('groups')
      .insert([{ user_id: user.id, name }])
      .select()
      .single();

    if (error) throw error;
    
    // Add the creator as the first member
    await this.addGroupMember(data.id, { 
      userId: user.id, 
      name: 'Você', 
      paid: 0 
    });

    return data;
  },

  async updateGroup(id, name) {
    const { data, error } = await supabase
      .from('groups')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteGroup(id) {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async addGroupMember(groupId, member) {
    const { data, error } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupId,
        user_id: member.userId || null,
        name: member.name,
        paid: member.paid || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeGroupMember(memberId) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
  },

  // --- NOTIFICATIONS ---
  async getNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:profiles!sender_id(full_name, avatar_url)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(n => ({
      id: n.id,
      type: n.type,
      sender: {
        name: n.sender.full_name,
        avatar: n.sender.avatar_url
      },
      data: n.data,
      createdAt: n.created_at
    }));
  },

  async sendShoppingInvite(friendId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notifications')
      .insert([{
        sender_id: user.id,
        receiver_id: friendId,
        type: 'shopping_invite',
        status: 'pending'
      }]);

    if (error) throw error;
  },

  async respondToNotification(notificationId, status) {
    const { data: notification, error: getError } = await supabase
      .from('notifications')
      .update({ status })
      .eq('id', notificationId)
      .select()
      .single();

    if (getError) throw getError;

    if (status === 'accepted' && notification.type === 'shopping_invite') {
      // Create share record
      const { error: shareError } = await supabase
        .from('shopping_shares')
        .upsert([{
          owner_id: notification.sender_id,
          collaborator_id: notification.receiver_id
        }], { onConflict: 'owner_id,collaborator_id' });

      if (shareError) throw shareError;
    }
  }
};

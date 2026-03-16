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
      type: t.type,
      amount: parseFloat(t.amount),
      title: t.title,
      emoji: t.emoji,
      dueDate: t.due_date,
      status: t.status,
      splitWith: t.split_with || [],
      installments: t.installments
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
        installments: transaction.installments
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
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
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
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        friend:profiles!friends_friend_id_fkey(id, email, full_name, avatar_url),
        user:profiles!friends_user_id_fkey(id, email, full_name, avatar_url)
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) throw error;

    // Extract the profile that is NOT the current user
    return data.map(f => {
      const profile = f.user_id === user.id ? f.user : f.friend;
      return {
        id: profile.id,
        name: profile.full_name,
        avatar: profile.avatar_url,
        email: profile.email
      };
    });
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
  }
};

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
      groupId: t.group_id,
      paidById: t.paid_by_id,
      paidByName: t.paid_by_name,
      attachmentUrl: t.attachment_url,
      createdAt: t.created_at
    }));
  },

  async addTransaction(transaction) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const installmentCount = parseInt(transaction.installmentCount) || 1;
    const monthlyAmount = transaction.amount / installmentCount;
    const transactionsToInsert = [];

    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date(transaction.dueDate + 'T12:00:00');
      const originalDay = dueDate.getDate();
      
      // Increment months
      dueDate.setMonth(dueDate.getMonth() + i);
      
      // If the day changed (e.g. Jan 31 -> Feb 28/29), adjust to last day of month
      if (dueDate.getDate() !== originalDay && i > 0) {
        dueDate.setDate(0); // Go to last day of previous month
      }

      transactionsToInsert.push({
        user_id: user.id,
        type: transaction.type,
        amount: monthlyAmount,
        title: transaction.title,
        emoji: transaction.emoji,
        due_date: dueDate.toISOString().split('T')[0],
        status: transaction.status,
        split_with: transaction.splitWith,
        installments: installmentCount > 1 ? `${i + 1}/${installmentCount}` : transaction.installments,
        group_id: transaction.groupId,
        paid_by_id: transaction.paidById,
        paid_by_name: transaction.paidByName,
        attachment_url: transaction.attachmentUrl
      });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select();

    if (error) throw error;
    
    const createdTransaction = data[0]; // Return the first one (current month)

    // Handle Notifications
    try {
      if (transaction.splitWith && transaction.splitWith.length > 0) {
        // Individual splits
        const notifications = transaction.splitWith.map(receiverId => ({
          sender_id: user.id,
          receiver_id: receiverId,
          type: 'transaction_split',
          status: 'pending',
          data: {
            transactionId: createdTransaction.id,
            amount: transaction.amount,
            title: transaction.title
          }
        }));
        await supabase.from('notifications').insert(notifications);
      } else if (transaction.groupId) {
        // Group transaction
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', transaction.groupId);

        if (groupMembers) {
          const notifications = groupMembers
            .filter(m => m.user_id && m.user_id !== user.id)
            .map(m => ({
              sender_id: user.id,
              receiver_id: m.user_id,
              type: 'group_transaction',
              status: 'pending',
              data: {
                transactionId: createdTransaction.id,
                amount: transaction.amount,
                title: transaction.title,
                groupId: transaction.groupId
              }
            }));
          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
          }
        }
      }
    } catch (nError) {
      console.error('Error creating transaction notifications:', nError);
    }

    return createdTransaction;
  },

  async updateTransaction(id, updates) {
    const dbUpdates = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.splitWith !== undefined) dbUpdates.split_with = updates.splitWith;
    if (updates.installments !== undefined) dbUpdates.installments = updates.installments;
    if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
    if (updates.paidById !== undefined) dbUpdates.paid_by_id = updates.paidById;
    if (updates.paidByName !== undefined) dbUpdates.paid_by_name = updates.paidByName;
    if (updates.attachmentUrl !== undefined) dbUpdates.attachment_url = updates.attachmentUrl;

    console.log('Update Transaction Payload:', { id, dbUpdates });
    const { data, error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update Transaction DB Error:', error);
      throw error;
    }
    console.log('Update Transaction Selection Success:', data);
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
    if (!user) return { items: [], collaborators: [] };

    // Get lists shared by or with the user
    const { data: shares, error: sharesError } = await supabase
      .from('shopping_shares')
      .select('owner_id, collaborator_id')
      .or(`owner_id.eq.${user.id},collaborator_id.eq.${user.id}`);

    if (sharesError) throw sharesError;

    // The items we can see are our own + those belonging to people who shared with us
    const ownersFromShares = shares?.map(s => s.collaborator_id === user.id ? s.owner_id : null).filter(Boolean) || [];
    const ownerIds = [user.id, ...ownersFromShares];

    const { data: items, error: itemsError } = await supabase
      .from('shopping_items')
      .select('*')
      .in('user_id', ownerIds)
      .order('created_at', { ascending: false });
    
    if (itemsError) throw itemsError;

    // Get all unique people involved in these lists to show their avatars
    const allPeopleIds = [...new Set([
      user.id,
      ...(shares?.map(s => s.owner_id) || []),
      ...(shares?.map(s => s.collaborator_id) || [])
    ])];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', allPeopleIds);

    if (profilesError) throw profilesError;

    return {
      items,
      collaborators: profiles
    };
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
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('USER_NOT_FOUND');
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
  },

  async removeShoppingShare(collaboratorId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('shopping_shares')
      .delete()
      .or(`and(owner_id.eq.${user.id},collaborator_id.eq.${collaboratorId}),and(owner_id.eq.${collaboratorId},collaborator_id.eq.${user.id})`);

    if (error) throw error;
  },

  async uploadTransactionAttachment(file) {
    console.log('--- STARTING DATABASE ATTACHMENT UPLOAD ---');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found for upload');
      throw new Error('User not authenticated');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    console.log('Target Storage path:', filePath);
    console.log('Attempting Supabase storage upload...');
    
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('SUPABASE STORAGE UPLOAD ERROR:', uploadError);
      throw uploadError;
    }
    
    console.log('Supabase storage upload successful!');

    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      console.error('Url generation failed: data or publicUrl is missing');
      throw new Error('Failed to generate public URL');
    }

    console.log('Generated public attachment URL:', data.publicUrl);
    return data.publicUrl;
  }
};

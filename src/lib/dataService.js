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
  }
};

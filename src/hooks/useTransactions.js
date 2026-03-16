import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await dataService.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (t) => {
    try {
      const newTransaction = await dataService.addTransaction(t);
      // Re-fetch to ensure we have the correct DB state (including generated IDs)
      await fetchTransactions();
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (updated) => {
    try {
      await dataService.updateTransaction(updated.id, updated);
      // Optimistic update for UI speed
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (error) {
      console.error('Error updating transaction:', error);
      fetchTransactions(); // Rollback on error
      throw error;
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await dataService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      fetchTransactions(); // Rollback on error
      throw error;
    }
  };

  return { 
    transactions, 
    loading, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    refresh: fetchTransactions 
  };
};

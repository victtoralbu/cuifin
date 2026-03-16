import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

const LoginScreen = () => {
  const { handleLoginSuccess } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-sm w-full"
      >
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tighter italic">CuiFin</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">SEU CUIDADO FINANCEIRO</p>
        </div>

        <div className="py-12 flex justify-center">
          <div className="w-24 h-24 bg-verde rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-verde/20">
            <span className="text-4xl -rotate-12">💰</span>
          </div>
        </div>

        <div className="space-y-6 flex flex-col items-center">
          <p className="text-zinc-400 text-sm px-4">
            Gerencie suas finanças pessoais e divida contas com facilidade.
          </p>
          
          <div className="w-full flex justify-center scale-110">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => console.log('Login Failed')}
              useOneTap
              theme={window.matchMedia('(prefers-color-scheme: dark)').matches ? "outline" : "filled_black"}
              shape="pill"
              text="signin_with"
              locale="pt_BR"
            />
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest pt-12">
          SEU CUIDADO FINANCEIRO
        </p>
      </motion.div>
    </div>
  );
};

export default LoginScreen;

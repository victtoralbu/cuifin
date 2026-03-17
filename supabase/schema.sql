-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow all users to discover each other for friend selection
DROP POLICY IF EXISTS "Users can discover other profiles" ON public.profiles;
CREATE POLICY "Users can discover other profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('receita', 'despesa')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT,
  due_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('pendente', 'pago')) DEFAULT 'pendente',
  split_with TEXT[], -- IDs of users to split with
  installments TEXT, -- e.g., "1/12"
  group_id UUID REFERENCES public.groups ON DELETE SET NULL,
  paid_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_by_name TEXT,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to check group membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage transactions" ON public.transactions;
CREATE POLICY "Users can manage transactions" ON public.transactions
  FOR ALL USING (
    auth.uid() = user_id OR 
    auth.uid()::text = ANY(split_with) OR
    public.is_group_member(group_id)
  );

-- Create shopping list table
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(12,2) DEFAULT 0,
  bought BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on shopping_items
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own shopping items" ON public.shopping_items;
CREATE POLICY "Users can manage their own shopping items" ON public.shopping_items
  FOR ALL USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create friends table for social connections
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on friends
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own friends" ON public.friends;
CREATE POLICY "Users can view their own friends" ON public.friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can add friends" ON public.friends;
CREATE POLICY "Users can add friends" ON public.friends
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can remove friends" ON public.friends;
CREATE POLICY "Users can remove friends" ON public.friends
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Allow users to see profiles of their friends
DROP POLICY IF EXISTS "Users can view profiles of their friends" ON public.profiles;
CREATE POLICY "Users can view profiles of their friends" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.friends 
      WHERE (user_id = auth.uid() AND friend_id = public.profiles.id)
         OR (friend_id = auth.uid() AND user_id = public.profiles.id)
    )
  );

DROP POLICY IF EXISTS "Any user can find another profile by email" ON public.profiles;
CREATE POLICY "Any user can find another profile by email" ON public.profiles
  FOR SELECT USING (true);


-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can manage groups" ON public.groups;
CREATE POLICY "Users can manage groups" ON public.groups
  FOR ALL USING (
    auth.uid() = user_id OR
    public.is_group_member(id)
  );

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE, -- Can be null for legacy/manual names
  name TEXT, -- Fallback for manual names
  paid DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can manage group members" ON public.group_members;
CREATE POLICY "Users can manage group members" ON public.group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND user_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- e.g., 'shopping_invite'
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, accepted, rejected
  data JSONB DEFAULT '{}'::jsonb, -- Store extra info like list name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Create shopping_shares table
CREATE TABLE IF NOT EXISTS public.shopping_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  collaborator_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(owner_id, collaborator_id)
);

-- Enable RLS on shopping_shares
ALTER TABLE public.shopping_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their shopping shares" ON public.shopping_shares;
CREATE POLICY "Users can view their shopping shares" ON public.shopping_shares
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = collaborator_id);

DROP POLICY IF EXISTS "System can manage shopping shares" ON public.shopping_shares;
CREATE POLICY "System can manage shopping shares" ON public.shopping_shares
  FOR ALL USING (auth.uid() = owner_id OR auth.uid() = collaborator_id);

-- Update shopping_items RLS to allow shared access
DROP POLICY IF EXISTS "Users can manage shopping items" ON public.shopping_items;
CREATE POLICY "Users can manage shopping items" ON public.shopping_items
  FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.shopping_shares
      WHERE owner_id = public.shopping_items.user_id AND collaborator_id = auth.uid()
    )
  );
  
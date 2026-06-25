-- Profiles table (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Collaborations table (replaces localStorage)
CREATE TABLE collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  influencer_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Hubungi'
    CHECK (status IN ('Belum Hubungi', 'Sudah di-DM', 'Menunggu Balasan', 'Setuju / Negosiasi', 'Selesai / Running', 'Ditolak / Gagal')),
  campaign_name TEXT DEFAULT '',
  personalized_dm TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  budget_est BIGINT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collaborations"
  ON collaborations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collaborations"
  ON collaborations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collaborations"
  ON collaborations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collaborations"
  ON collaborations FOR DELETE
  USING (auth.uid() = user_id);

-- Chat messages table (replaces in-memory storage)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat messages"
  ON chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE profiles DISABLE TRIGGER guard_credits;
UPDATE profiles SET credits_balance = 100310 WHERE user_id = 'aec46a7d-903e-49b4-b2f9-b8d22d4cb3e3';
ALTER TABLE profiles ENABLE TRIGGER guard_credits;
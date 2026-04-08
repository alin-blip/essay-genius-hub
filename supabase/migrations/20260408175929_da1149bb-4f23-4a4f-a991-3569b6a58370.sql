ALTER TABLE profiles DISABLE TRIGGER guard_credits;
UPDATE profiles SET credits_balance = credits_balance + 5000 WHERE user_id = 'bb23acef-ad7b-40d9-8797-3f12e6846e9c';
ALTER TABLE profiles ENABLE TRIGGER guard_credits;
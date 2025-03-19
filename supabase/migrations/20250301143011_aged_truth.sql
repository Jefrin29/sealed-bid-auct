/*
  # Add user roles and sealed bidding functionality

  1. Updates
    - Add `role` column to `profiles` table
    - Add `contact_address` and `contact_number` to `profiles` table
    - Add `sealed_bidding` column to `auctions` table
    - Add `notifications` table for user notifications
  
  2. Security
    - Update RLS policies for new tables and columns
    - Add policies for notifications table
*/

-- Add role to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('buyer', 'seller', 'hybrid')) DEFAULT 'buyer',
ADD COLUMN IF NOT EXISTS contact_address text,
ADD COLUMN IF NOT EXISTS contact_number text;

-- Add sealed_bidding to auctions
ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS sealed_bidding boolean DEFAULT true;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create function to determine auction winner
CREATE OR REPLACE FUNCTION determine_auction_winner()
RETURNS trigger AS $$
DECLARE
    winning_bid RECORD;
    winner_user_id uuid;
BEGIN
    -- Only process if auction status changed to 'ended'
    IF NEW.status = 'ended' AND OLD.status = 'active' THEN
        -- Find the highest bid
        SELECT * INTO winning_bid
        FROM public.bids
        WHERE auction_id = NEW.id
        ORDER BY amount DESC
        LIMIT 1;
        
        IF winning_bid IS NOT NULL THEN
            -- Update auction with winner info
            UPDATE public.auctions
            SET winner_id = winning_bid.bidder_id,
                winning_bid_id = winning_bid.id
            WHERE id = NEW.id;
            
            -- Create notification for winner
            INSERT INTO public.notifications (user_id, title, message)
            VALUES (
                winning_bid.bidder_id,
                'Auction Won!',
                'Congratulations! You won the auction for item: ' || 
                (SELECT title FROM public.products WHERE id = NEW.product_id)
            );
            
            -- Create notification for seller
            INSERT INTO public.notifications (user_id, title, message)
            VALUES (
                (SELECT seller_id FROM public.products WHERE id = NEW.product_id),
                'Auction Ended',
                'Your auction has ended with a winning bid of $' || winning_bid.amount
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auction winner determination
DROP TRIGGER IF EXISTS determine_winner_trigger ON public.auctions;
CREATE TRIGGER determine_winner_trigger
    AFTER UPDATE ON public.auctions
    FOR EACH ROW
    EXECUTE FUNCTION determine_auction_winner();
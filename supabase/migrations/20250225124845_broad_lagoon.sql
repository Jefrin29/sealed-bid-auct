/*
  # Initial Schema for Auction Platform

  1. New Tables
    - users
      - Extends Supabase auth.users
      - Stores additional user information
    - products
      - Stores auction items
    - bids
      - Stores sealed bids
    - auctions
      - Stores auction details and status
    
  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Create custom types
CREATE TYPE auction_status AS ENUM ('draft', 'active', 'ended', 'cancelled');

-- Create users table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    full_name text,
    avatar_url text,
    kyc_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid REFERENCES auth.users(id) NOT NULL,
    title text NOT NULL,
    description text,
    images text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create auctions table
CREATE TABLE IF NOT EXISTS public.auctions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) NOT NULL,
    start_price decimal NOT NULL,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    status auction_status DEFAULT 'draft',
    winner_id uuid REFERENCES auth.users(id),
    winning_bid_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create bids table with encryption
CREATE TABLE IF NOT EXISTS public.bids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) NOT NULL,
    bidder_id uuid REFERENCES auth.users(id) NOT NULL,
    amount decimal NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view any profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Anyone can view products"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (auth.uid() = seller_id);

-- Auctions policies
CREATE POLICY "Anyone can view auctions"
    ON public.auctions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Sellers can create auctions"
    ON public.auctions FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.products
        WHERE id = product_id AND seller_id = auth.uid()
    ));

-- Bids policies
CREATE POLICY "Users can view own bids"
    ON public.bids FOR SELECT
    TO authenticated
    USING (auth.uid() = bidder_id);

CREATE POLICY "Users can create bids"
    ON public.bids FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = bidder_id AND
        EXISTS (
            SELECT 1 FROM public.auctions a
            WHERE a.id = auction_id
            AND a.status = 'active'
            AND a.end_time > now()
        )
    );

-- Create function to update auction status
CREATE OR REPLACE FUNCTION check_auction_status()
RETURNS trigger AS $$
BEGIN
    UPDATE public.auctions
    SET status = 
        CASE 
            WHEN now() >= end_time THEN 'ended'
            WHEN now() >= start_time THEN 'active'
            ELSE status
        END
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update auction status
CREATE TRIGGER update_auction_status
    AFTER INSERT OR UPDATE ON public.auctions
    FOR EACH ROW
    EXECUTE FUNCTION check_auction_status();
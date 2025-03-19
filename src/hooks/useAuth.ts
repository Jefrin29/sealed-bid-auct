import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string, contactAddress: string, contactNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  contact_address: string | null;
  contact_number: string | null;
  kyc_verified: boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  
  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },
  
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Refresh profile after update
      await get().refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Fetch profile after sign in
    if (data.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                full_name: '',
                role: 'buyer',
                avatar_url: '',
              });
            
            if (insertError) {
              console.error('Error creating profile:', insertError);
            } else {
              // Fetch the newly created profile
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();
                
              set({ profile: newProfile });
            }
          } else {
            console.error('Error fetching profile:', profileError);
          }
        } else {
          set({ profile: profile });
        }
      } catch (err) {
        console.error('Error in profile handling:', err);
      }
    }
  },
  
  signUp: async (email, password, fullName, role, contactAddress, contactNumber) => {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        // Check for specific error messages
        if (signUpError.message.includes('User already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw signUpError;
      }
      
      if (authData.user) {
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: fullName,
            role: role,
            contact_address: contactAddress,
            contact_number: contactNumber,
            avatar_url: '',
          });
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw new Error('Failed to create user profile');
        }
        
        // Fetch the newly created profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
          
        set({ profile: profile });
      }
    } catch (error) {
      // Re-throw the error to be handled by the Auth component
      throw error;
    }
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, profile: null });
  },
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  useAuth.setState({ user: session?.user || null });
  
  // Fetch profile when auth state changes
  if (session?.user) {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        useAuth.setState({ profile: data, loading: false });
      })
      .catch((error) => {
        console.error('Error fetching profile on auth change:', error);
        useAuth.setState({ loading: false });
      });
  } else {
    useAuth.setState({ loading: false });
  }
});

// Initialize auth state immediately
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuth.setState({ user: session?.user || null });
  
  // Fetch profile on initial load
  if (session?.user) {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        useAuth.setState({ profile: data, loading: false });
      })
      .catch((error) => {
        console.error('Error fetching profile on initial load:', error);
        useAuth.setState({ loading: false });
      });
  } else {
    useAuth.setState({ loading: false });
  }
});